import { cookies } from "next/headers";
import { connection } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME, AuthenticatedUser } from "./session";
import { Permission, hasPermission, Role } from "./roles";
import { Result } from "@/lib/dal/types";

/**
 * Retrieves the currently authenticated user from the active HTTP request session cookie.
 * Returns null if the request is unauthenticated or the session is expired/revoked.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    try { await connection(); } catch {}
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return null;
    }
    const verified = await verifySessionToken(token);
    return verified ? verified.user : null;
  } catch {
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