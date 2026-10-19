"use server";

import { cookies } from "next/headers";
import prisma from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, revokeSessionToken, SESSION_COOKIE_NAME, SESSION_TTL_MS, AuthenticatedUser } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/guards";
import { Result } from "@/lib/dal/types";

export interface LoginDTO {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthenticatedUser;
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
    };

    return {
      success: true,
      data: { user: authenticatedUser },
    };
  } catch (error: unknown) {
    // Sanitize internal error details; do not leak SQL, Prisma or environment exceptions to client
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