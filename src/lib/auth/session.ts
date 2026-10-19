import crypto from "crypto";
import prisma from "@/lib/db";
import { Session } from "@prisma/client";

export const SESSION_COOKIE_NAME = "rpihm_session_token";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  staffId: string | null;
  studentId: string | null;
}

export interface SessionVerificationResult {
  session: Session;
  user: AuthenticatedUser;
}

/**
 * Derives a deterministic SHA-256 hash of the raw session token for secure storage at rest.
 * Prevents database leaks from yielding re-playable session tokens.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a cryptographically random session token (32 bytes / 64 hex characters),
 * stores its SHA-256 hash at rest, and returns the raw token to be delivered via HTTP-only cookie.
 */
export async function createSession(
  userId: string,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<{ token: string; session: Session }> {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const session = await prisma.session.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    },
  });

  return { token, session };
}

/**
 * Verifies a raw session token against the database by checking its SHA-256 hash.
 * Returns null if the token does not exist, has expired, has been revoked, or belongs to an inactive user.
 */
export async function verifySessionToken(token: string): Promise<SessionVerificationResult | null> {
  if (!token || typeof token !== "string" || token.length !== 64) {
    return null;
  }

  try {
    const tokenHash = hashSessionToken(token);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: true,
      },
    });

    if (!session) {
      return null;
    }

    // Check revocation
    if (session.revokedAt !== null) {
      return null;
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      return null;
    }

    // Check user account status
    if (!session.user.isActive) {
      return null;
    }

    const user: AuthenticatedUser = {
      id: session.user.id,
      email: session.user.email,
      fullName: session.user.fullName,
      role: session.user.role,
      staffId: session.user.staffId,
      studentId: session.user.studentId,
    };

    return { session, user };
  } catch {
    return null;
  }
}

/**
 * Revokes an active session by matching its hashed token.
 */
export async function revokeSessionToken(token: string): Promise<boolean> {
  if (!token || typeof token !== "string") return false;
  try {
    const tokenHash = hashSessionToken(token);
    await prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Revokes all sessions for a specific user account (e.g. on password change or admin reset).
 */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  try {
    const result = await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  } catch {
    return 0;
  }
}