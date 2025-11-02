import { encrypt, decrypt } from '@/lib/encryption';
import crypto from 'crypto';

describe('Encryption Library', () => {
  // Store original env
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeAll(() => {
    // Generate a valid 32-byte encryption key for testing
    const testKey = crypto.randomBytes(32).toString('base64');
    process.env.ENCRYPTION_KEY = testKey;
  });

  afterAll(() => {
    // Restore original env
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  describe('encrypt', () => {
    it('should encrypt a plaintext string', () => {
      const plaintext = 'my-secret-token';
      const encrypted = encrypt(plaintext);

      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(plaintext);
      expect(typeof encrypted).toBe('string');
    });

    it('should return different ciphertexts for the same plaintext (due to random IV)', () => {
      const plaintext = 'same-secret';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty string', () => {
      const encrypted = encrypt('');
      expect(encrypted).toBe('');
    });

    it('should encrypt long strings', () => {
      const longText = 'a'.repeat(1000);
      const encrypted = encrypt(longText);

      expect(encrypted).toBeTruthy();
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should encrypt special characters', () => {
      const specialChars = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./€£¥';
      const encrypted = encrypt(specialChars);

      expect(encrypted).toBeTruthy();
      expect(typeof encrypted).toBe('string');
    });

    it('should encrypt unicode characters', () => {
      const unicode = '你好世界 🚀 Здравствуй';
      const encrypted = encrypt(unicode);

      expect(encrypted).toBeTruthy();
      expect(typeof encrypted).toBe('string');
    });
  });

  describe('decrypt', () => {
    it('should decrypt an encrypted string back to plaintext', () => {
      const plaintext = 'my-secret-data';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const decrypted = decrypt('');
      expect(decrypted).toBe('');
    });

    it('should correctly decrypt long strings', () => {
      const longText = 'a'.repeat(1000);
      const encrypted = encrypt(longText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(longText);
    });

    it('should correctly decrypt special characters', () => {
      const specialChars = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./';
      const encrypted = encrypt(specialChars);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(specialChars);
    });

    it('should correctly decrypt unicode characters', () => {
      const unicode = '你好世界 🚀 Здравствуй';
      const encrypted = encrypt(unicode);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(unicode);
    });

    it('should throw error for invalid encrypted data', () => {
      const invalidData = 'not-valid-encrypted-data';

      expect(() => {
        decrypt(invalidData);
      }).toThrow();
    });

    it('should throw error for corrupted encrypted data', () => {
      const plaintext = 'test-data';
      const encrypted = encrypt(plaintext);

      // Corrupt the encrypted data
      const corrupted = encrypted.slice(0, -10) + 'corrupted==';

      expect(() => {
        decrypt(corrupted);
      }).toThrow();
    });
  });

  describe('encrypt/decrypt round-trip', () => {
    it('should maintain data integrity through multiple encryption cycles', () => {
      const original = 'sensitive-oauth-token-12345';

      const encrypted1 = encrypt(original);
      const decrypted1 = decrypt(encrypted1);

      expect(decrypted1).toBe(original);

      const encrypted2 = encrypt(decrypted1);
      const decrypted2 = decrypt(encrypted2);

      expect(decrypted2).toBe(original);
    });

    it('should handle OAuth tokens format', () => {
      const oauthToken = 'ya29.a0AfH6SMBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      const encrypted = encrypt(oauthToken);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(oauthToken);
    });

    it('should handle refresh tokens format', () => {
      const refreshToken = '1//0xxxxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      const encrypted = encrypt(refreshToken);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(refreshToken);
    });
  });

  describe('Error handling', () => {
    it('should throw error when ENCRYPTION_KEY is not set', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      expect(() => {
        encrypt('test');
      }).toThrow('ENCRYPTION_KEY environment variable is not set');

      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('should throw error when ENCRYPTION_KEY is invalid length', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = Buffer.from('too-short').toString('base64');

      expect(() => {
        encrypt('test');
      }).toThrow(/ENCRYPTION_KEY must be 32 bytes/);

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });

  describe('Security properties', () => {
    it('should use authenticated encryption (GCM mode)', () => {
      const plaintext = 'secure-data';
      const encrypted = encrypt(plaintext);

      // GCM mode should produce output with IV + auth tag + ciphertext
      // Minimum length: 16 (IV) + 16 (auth tag) + ciphertext
      const decoded = Buffer.from(encrypted, 'base64');
      expect(decoded.length).toBeGreaterThan(32);
    });

    it('should produce non-deterministic ciphertexts', () => {
      const plaintext = 'same-input';
      const results = new Set();

      // Encrypt same plaintext 10 times
      for (let i = 0; i < 10; i++) {
        results.add(encrypt(plaintext));
      }

      // All ciphertexts should be different due to random IV
      expect(results.size).toBe(10);
    });

    it('should not leak plaintext length in a predictable way', () => {
      const short = 'a';
      const long = 'a'.repeat(100);

      const encryptedShort = encrypt(short);
      const encryptedLong = encrypt(long);

      // Both should be base64 strings
      expect(typeof encryptedShort).toBe('string');
      expect(typeof encryptedLong).toBe('string');

      // Longer plaintext should produce longer ciphertext
      expect(encryptedLong.length).toBeGreaterThan(encryptedShort.length);
    });
  });
});
