import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get encryption key from environment variable
 * Key must be 32 bytes (256 bits) for AES-256
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  // Convert base64 key to buffer
  const keyBuffer = Buffer.from(key, 'base64');

  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (use: openssl rand -base64 32)`);
  }

  return keyBuffer;
}

/**
 * Encrypt a string value
 * Returns base64-encoded string containing IV + auth tag + ciphertext
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Combine IV + auth tag + ciphertext
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(ciphertext, 'base64')
  ]);

  return combined.toString('base64');
}

/**
 * Decrypt an encrypted string
 * Expects base64-encoded string containing IV + auth tag + ciphertext
 */
export function decrypt(encrypted: string): string {
  if (!encrypted) return encrypted;

  const key = getEncryptionKey();
  const combined = Buffer.from(encrypted, 'base64');

  // Extract IV, auth tag, and ciphertext
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(ciphertext, undefined, 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}
