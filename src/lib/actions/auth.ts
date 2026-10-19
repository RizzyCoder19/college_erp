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

/**
 * Authenticates user credentials and establishes a secure HTTP-only session cookie.
 * Generic error messaging protects against user enumeration.
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

    // Constant-time check or failure simulation
    if (!user || !user.isActive) {
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

    // Establish session
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
    const message = error instanceof Error ? error.message : "Authentication service failure";
    return {
      success: false,
      error: message,
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
    const message = error instanceof Error ? error.message : "Logout failed";
    return { success: false, error: message };
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
    const message = error instanceof Error ? error.message : "Session inspection failed";
    return { success: false, error: message };
  }
}