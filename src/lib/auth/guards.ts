import { cookies } from "next/headers";
import { connection } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME, AuthenticatedUser } from "./session";
import { Permission, hasPermission, Role } from "./roles";
import { Result } from "@/lib/dal/types";

let testSessionToken: string | null = null;

/**
 * For isolated testing environments only: allows simulating an active session token
 * when calling server actions outside a Next.js HTTP request scope.
 *
 * HARDENED: Strictly prohibited in production. Throws an error immediately
 * if invoked in a production environment (NODE_ENV === "production" or VERCEL === "1").
 */
export function setTestSessionToken(token: string | null): void {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
    throw new Error(
      "Security violation: setTestSessionToken is a test-only utility and is strictly disabled in production environments."
    );
  }
  testSessionToken = token;
}

/**
 * Retrieves the currently authenticated user from the active HTTP request session cookie.
 * In production, session identity is derived EXCLUSIVELY from verified HTTP session cookies.
 * Returns null if the request is unauthenticated or the session is expired/revoked.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  try {
    try { await connection(); } catch {}
    const cookieStore = await cookies();
    // In production, NEVER check or read testSessionToken
    const token =
      cookieStore.get(SESSION_COOKIE_NAME)?.value ||
      (!isProduction ? testSessionToken : null);
    if (!token) {
      return null;
    }
    const verified = await verifySessionToken(token);
    return verified ? verified.user : null;
  } catch {
    if (!isProduction && testSessionToken) {
      const verified = await verifySessionToken(testSessionToken);
      return verified ? verified.user : null;
    }
    return null;
  }
}

/**
 * Enforces that an active authenticated session is present.
 */
export async function requireAuth(): Promise<Result<AuthenticatedUser>> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: "Authentication required. Please sign in to access institutional resources.",
      code: "UNAUTHORIZED",
    };
  }
  return { success: true, data: user };
}

/**
 * Enforces that the authenticated user possesses the required permission.
 */
export async function requirePermission(permission: Permission): Promise<Result<AuthenticatedUser>> {
  const auth = await requireAuth();
  if (!auth.success || !auth.data) {
    return auth;
  }
  const user = auth.data;
  if (!hasPermission(user.role, permission)) {
    return {
      success: false,
      error: `Access denied. You do not hold the '${permission}' authorization required for this operation.`,
      code: "FORBIDDEN",
    };
  }
  return { success: true, data: user };
}

/**
 * Enforces that the authenticated user holds a specific development role.
 */
export async function requireRole(role: Role): Promise<Result<AuthenticatedUser>> {
  const auth = await requireAuth();
  if (!auth.success || !auth.data) {
    return auth;
  }
  const user = auth.data;
  if (user.role !== role && user.role !== "SYSTEM_ADMIN") {
    return {
      success: false,
      error: `Access denied. Role '${role}' is required for this operation.`,
      code: "FORBIDDEN",
    };
  }
  return { success: true, data: user };
}