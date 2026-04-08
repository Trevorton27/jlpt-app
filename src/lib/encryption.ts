import "server-only";
import crypto from "node:crypto";

// AES-256-GCM encryption for secrets stored in DB.
// Master secret is provided via USER_SECRET_ENCRYPTION_KEY. It must decode to
// 32 bytes (base64, hex, or a 32-char utf8 string are all accepted).

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard
const AUTH_TAG_LENGTH = 16;

function loadMasterKey(): Buffer {
  const raw = process.env.USER_SECRET_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "USER_SECRET_ENCRYPTION_KEY is not set. Generate a 32-byte key and add it to your environment."
    );
  }

  // Try base64 first
  try {
    const b = Buffer.from(raw, "base64");
    if (b.length === 32) return b;
  } catch {}

  // Try hex
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length === 64) {
    return Buffer.from(raw, "hex");
  }

  // Fallback: utf8 bytes (must be 32)
  const utf8 = Buffer.from(raw, "utf8");
  if (utf8.length === 32) return utf8;

  throw new Error(
    "USER_SECRET_ENCRYPTION_KEY must decode to exactly 32 bytes (base64, hex, or 32-char utf8)."
  );
}

let cachedKey: Buffer | null = null;
function getMasterKey(): Buffer {
  if (!cachedKey) cachedKey = loadMasterKey();
  return cachedKey;
}

/**
 * Encrypts a UTF-8 string and returns a single base64 token:
 * base64(iv || authTag || ciphertext)
 */
export function encryptSecret(plaintext: string): string {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("encryptSecret: plaintext must be a non-empty string");
  }
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

/**
 * Decrypts a base64 token produced by encryptSecret and returns the plaintext.
 */
export function decryptSecret(token: string): string {
  if (typeof token !== "string" || token.length === 0) {
    throw new Error("decryptSecret: token must be a non-empty string");
  }
  const key = getMasterKey();
  const buf = Buffer.from(token, "base64");
  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("decryptSecret: token is too short / malformed");
  }
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

export function last4(secret: string): string {
  if (!secret) return "";
  return secret.slice(-4);
}
