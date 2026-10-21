"use server";

import { cookies } from "next/headers";
import prisma from "@/lib/db";
import { verifyPassword, hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import {
  createSession,
  revokeSessionToken,
  revokeAllUserSessions,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  AuthenticatedUser,
} from "@/lib/auth/session";
import { getCurrentUser, requirePermission } from "@/lib/auth/guards";
import { Role } from "@/lib/auth/roles";
import { Result } from "@/lib/dal/types";

export interface LoginDTO {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthenticatedUser;
}

export interface ProvisionStaffAccountDTO {
  staffId: string;
  email: string;
  role: Role;
  initialPassword: string;
}

export interface ProvisionStaffAccountResponse {
  id: string;
  email: string;
  fullName: string;
  role: string;
  staffId: string;
}

// Fixed dummy salt (32 hex) and hash (128 hex) to equalize execution timing
// across account-not-found, inactive account, and invalid password code paths.
const DUMMY_SALT = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
const DUMMY_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

/**
 * Authenticates user credentials and establishes a secure HTTP-only session cookie.
 * Generic error messaging and constant-time dummy verification protect against user enumeration.
 */
export async function loginAction(dto: LoginDTO): Promise<Result<LoginResponse>> {
  if (!dto.email || !dto.password) {
    return {
      success: false,
      error: "Please provide both email address and password.",
      code: "INVALID_INPUT",
    };
  }

  const normalizedEmail = dto.email.trim().toLowerCase();

  try {
    const user = await prisma.userAccount.findUnique({
      where: { email: normalizedEmail },
      include: {
        staff: {
          include: {
            department: true,
          },
        },
      },
    });

    // Timing-equalization: if user does not exist or is inactive,
    // execute dummy scrypt computation so external response time is indistinguishable.
    if (!user || !user.isActive) {
      verifyPassword(dto.password, DUMMY_HASH, DUMMY_SALT);
      return {
        success: false,
        error: "Invalid email address or password.",
        code: "INVALID_CREDENTIALS",
      };
    }

    const isValid = verifyPassword(dto.password, user.passwordHash, user.salt);
    if (!isValid) {
      return {
        success: false,
        error: "Invalid email address or password.",
        code: "INVALID_CREDENTIALS",
      };
    }

    // Capture if this is the account's first login before updating timestamp
    const isFirstLogin = user.lastLoginAt === null;

    // Establish session (stores SHA-256 hash at rest, returns raw token)
    const { token } = await createSession(user.id);

    // Update last login timestamp
    await prisma.userAccount.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Set secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      staffId: user.staffId,
      studentId: user.studentId,
      designation: user.staff?.designation || (user.role === "SYSTEM_ADMIN" ? "System Administrator" : null),
      departmentName: user.staff?.department?.name || null,
      isFirstLogin,
    };

    return {
      success: true,
      data: { user: authenticatedUser },
    };
  } catch (error: unknown) {
    console.error("[Auth Service Error]:", error instanceof Error ? error.message : "Unknown error");
    return {
      success: false,
      error: "Authentication service encountered an unexpected error. Please try again later.",
      code: "AUTH_ERROR",
    };
  }
}

/**
 * Invalidates the active session in the database and clears the session cookie.
 */
export async function logoutAction(): Promise<Result<boolean>> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await revokeSessionToken(token);
      cookieStore.delete(SESSION_COOKIE_NAME);
    }
    return { success: true, data: true };
  } catch (error: unknown) {
    console.error("[Logout Service Error]:", error instanceof Error ? error.message : "Unknown error");
    return {
      success: false,
      error: "Logout service encountered an unexpected error.",
      code: "AUTH_ERROR",
    };
  }
}

/**
 * Retrieves the currently active user session from the server.
 */
export async function getCurrentUserAction(): Promise<Result<AuthenticatedUser | null>> {
  try {
    const user = await getCurrentUser();
    return { success: true, data: user };
  } catch (error: unknown) {
    console.error("[Session Inspection Error]:", error instanceof Error ? error.message : "Unknown error");
    return {
      success: false,
      error: "Session inspection encountered an unexpected error.",
      code: "AUTH_ERROR",
    };
  }
}

/**
 * Provisions a login account for an existing staff member.
 * Strictly enforces 'ADMIN_ALL' permission (System Administrators only).
 * Validates unique email, unique staff linkage, and password strength.
 * Plaintext passwords are never logged or stored.
 */
export async function provisionStaffAccountAction(
  dto: ProvisionStaffAccountDTO
): Promise<Result<ProvisionStaffAccountResponse>> {
  const auth = await requirePermission("ADMIN_ALL");
  if (!auth.success || !auth.data) {
    return {
      success: false,
      error: auth.error || "Access denied. Only System Administrators may provision accounts.",
      code: "FORBIDDEN",
    };
  }

  // 1. Validation
  if (!dto.staffId || typeof dto.staffId !== "string") {
    return { success: false, error: "Valid staff ID is required.", code: "INVALID_INPUT" };
  }
  if (!dto.email || typeof dto.email !== "string") {
    return { success: false, error: "Valid email address is required.", code: "INVALID_INPUT" };
  }
  const normalizedEmail = dto.email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return { success: false, error: "Please provide a valid email format.", code: "INVALID_INPUT" };
  }

  const validRoles: Role[] = ["SYSTEM_ADMIN", "ACADEMIC_ADMIN", "FACULTY_MEMBER", "STUDENT_VIEWER"];
  if (!validRoles.includes(dto.role)) {
    return {
      success: false,
      error: `Invalid role selected. Allowed roles: ${validRoles.join(", ")}.`,
      code: "INVALID_INPUT",
    };
  }

  const pwCheck = validatePasswordStrength(dto.initialPassword);
  if (!pwCheck.valid) {
    return {
      success: false,
      error: pwCheck.error || "Password does not meet complexity requirements.",
      code: "WEAK_PASSWORD",
    };
  }

  try {
    // 2. Verify staff member exists
    const staff = await prisma.staff.findUnique({
      where: { id: dto.staffId },
      include: { userAccount: true },
    });
    if (!staff) {
      return { success: false, error: "Staff record not found in institutional database.", code: "NOT_FOUND" };
    }
    if (staff.userAccount) {
      return {
        success: false,
        error: `Staff member "${staff.fullName}" already has a provisioned account (${staff.userAccount.email}).`,
        code: "CONFLICT",
      };
    }

    // 3. Verify email uniqueness
    const existingEmail = await prisma.userAccount.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      return {
        success: false,
        error: `A user account with email "${normalizedEmail}" already exists.`,
        code: "DUPLICATE_EMAIL",
      };
    }

    // 4. Verify staffId uniqueness in UserAccount
    const existingStaffLink = await prisma.userAccount.findUnique({
      where: { staffId: staff.id },
    });
    if (existingStaffLink) {
      return {
        success: false,
        error: "A user account is already linked to this staff record.",
        code: "CONFLICT",
      };
    }

    // 5. Hash password with scrypt and unique 16-byte salt
    const { hash, salt } = hashPassword(dto.initialPassword);

    // 6. Create UserAccount
    const newUser = await prisma.userAccount.create({
      data: {
        email: normalizedEmail,
        fullName: staff.fullName,
        role: dto.role,
        passwordHash: hash,
        salt,
        staffId: staff.id,
        isActive: true,
      },
    });

    return {
      success: true,
      data: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        staffId: staff.id,
      },
    };
  } catch (error: unknown) {
    console.error("[Account Provisioning Error]:", error instanceof Error ? error.message : "Unknown error");
    return {
      success: false,
      error: "Failed to provision account due to an internal database error.",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Resets a staff user account's password.
 * Enforces 'ADMIN_ALL' permission and revokes all active sessions for security.
 */
export async function adminResetStaffPasswordAction(dto: {
  userAccountId: string;
  newPassword: string;
}): Promise<Result<boolean>> {
  const auth = await requirePermission("ADMIN_ALL");
  if (!auth.success || !auth.data) {
    return {
      success: false,
      error: "Access denied. Only System Administrators may reset passwords.",
      code: "FORBIDDEN",
    };
  }

  const pwCheck = validatePasswordStrength(dto.newPassword);
  if (!pwCheck.valid) {
    return {
      success: false,
      error: pwCheck.error || "Password does not meet complexity requirements.",
      code: "WEAK_PASSWORD",
    };
  }

  try {
    const user = await prisma.userAccount.findUnique({ where: { id: dto.userAccountId } });
    if (!user) {
      return { success: false, error: "User account not found.", code: "NOT_FOUND" };
    }

    const { hash, salt } = hashPassword(dto.newPassword);
    await prisma.userAccount.update({
      where: { id: user.id },
      data: { passwordHash: hash, salt },
    });

    // Revoke all existing sessions so old credentials cannot be used
    await revokeAllUserSessions(user.id);

    return { success: true, data: true };
  } catch (error: unknown) {
    console.error("[Password Reset Error]:", error instanceof Error ? error.message : "Unknown error");
    return { success: false, error: "Failed to reset password.", code: "INTERNAL_ERROR" };
  }
}
