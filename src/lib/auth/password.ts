import crypto from "crypto";

export interface HashResult {
  hash: string;
  salt: string;
}

/**
 * Derives a cryptographic hash from a plaintext password using standard scrypt.
 * Uses a unique 16-byte cryptographically secure random salt per password.
 */
export function hashPassword(password: string): HashResult {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

/**
 * Verifies a candidate plaintext password against an existing hash and salt.
 * Employs timingSafeEqual to protect against side-channel timing attacks.
 */
export function verifyPassword(password: string, expectedHash: string, salt: string): boolean {
  try {
    const candidateHash = crypto.scryptSync(password, salt, 64).toString("hex");
    const candidateBuffer = Buffer.from(candidateHash, "hex");
    const expectedBuffer = Buffer.from(expectedHash, "hex");

    if (candidateBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Validates basic password complexity for prototype user accounts.
 * Must be at least 8 characters and contain both letters and digits.
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters in length." };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  if (!hasLetter || !hasDigit) {
    return { valid: false, error: "Password must contain both letters and numbers." };
  }
  return { valid: true };
}