import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { env } from "./env";

// AES-256-GCM symmetric encryption for secrets at rest (mailbox IMAP/SMTP passwords).
//
// Stored format: `enc:v1:<base64(iv | authTag | ciphertext)>`
// The `enc:v1:` prefix lets `decryptSecret` distinguish encrypted values from legacy
// plaintext rows written before encryption existed — those are returned unchanged so
// the system keeps working during/after migration.

const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:v1:";
const IV_LENGTH = 12; // GCM standard nonce size
const AUTH_TAG_LENGTH = 16;

// Hash the configured key to a deterministic 32-byte buffer so any-length input works.
const KEY = createHash("sha256").update(env.MAILBOX_ENCRYPTION_KEY).digest();

/**
 * Encrypts a secret for storage. Returns the value unchanged when it is null/undefined
 * or already encrypted, so callers can pass it through idempotently.
 */
export function encryptSecret(plaintext: string | null | undefined): string | null | undefined {
  if (plaintext === null || plaintext === undefined) return plaintext;
  if (plaintext.startsWith(PREFIX)) return plaintext; // already encrypted

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

/**
 * Decrypts a stored secret. Values without the `enc:v1:` prefix are treated as legacy
 * plaintext and returned unchanged. Throws only on a genuine tampering/key mismatch.
 */
export function decryptSecret(stored: string | null | undefined): string | null | undefined {
  if (stored === null || stored === undefined) return stored;
  if (!stored.startsWith(PREFIX)) return stored; // legacy plaintext

  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
