import { hashPassword, verifyPassword } from '../src/utils/password';

describe('Password utilities', () => {
  describe('hashPassword', () => {
    test('returns a string different from the original password', async () => {
      const plain = 'testpassword123';
      const hash = await hashPassword(plain);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(plain);
      expect(hash.length).toBeGreaterThan(plain.length);
    });

    test('returns a bcrypt hash (starts with $2)', async () => {
      const plain = 'testpassword123';
      const hash = await hashPassword(plain);

      expect(hash).toMatch(/^\$2[ayb]\$/);
    });

    test('produces different hashes for the same password (due to salt)', async () => {
      const plain = 'testpassword123';
      const hash1 = await hashPassword(plain);
      const hash2 = await hashPassword(plain);

      expect(hash1).not.toBe(hash2);
      // But both should verify correctly
      expect(await verifyPassword(plain, hash1)).toBe(true);
      expect(await verifyPassword(plain, hash2)).toBe(true);
    });
  });

  describe('verifyPassword', () => {
    test('returns true for matching plaintext and bcrypt hash', async () => {
      const plain = 'testpassword123';
      const hash = await hashPassword(plain);

      const result = await verifyPassword(plain, hash);
      expect(result).toBe(true);
    });

    test('returns false for wrong password with bcrypt hash', async () => {
      const plain = 'testpassword123';
      const wrongPassword = 'wrongpassword';
      const hash = await hashPassword(plain);

      const result = await verifyPassword(wrongPassword, hash);
      expect(result).toBe(false);
    });

    test('returns false for empty hash', async () => {
      const result = await verifyPassword('anypassword', '');
      expect(result).toBe(false);
    });

    test('returns false for null/undefined hash', async () => {
      expect(await verifyPassword('anypassword', null as any)).toBe(false);
      expect(await verifyPassword('anypassword', undefined as any)).toBe(false);
    });

    test('supports legacy plaintext hash (for migration)', async () => {
      const plain = 'secret';
      const legacyHash = 'secret'; // Plaintext hash

      const result = await verifyPassword(plain, legacyHash);
      expect(result).toBe(true);
    });

    test('returns false for wrong password with legacy plaintext hash', async () => {
      const plain = 'secret';
      const wrongPassword = 'wrong';
      const legacyHash = 'secret';

      const result = await verifyPassword(wrongPassword, legacyHash);
      expect(result).toBe(false);
    });

    test('correctly identifies bcrypt hashes vs plaintext', async () => {
      const bcryptHash = await hashPassword('test');
      const plaintextHash = 'plaintext';

      // Bcrypt hash should use bcrypt.compare
      expect(await verifyPassword('test', bcryptHash)).toBe(true);
      expect(await verifyPassword('wrong', bcryptHash)).toBe(false);

      // Plaintext should use equality check
      expect(await verifyPassword('plaintext', plaintextHash)).toBe(true);
      expect(await verifyPassword('wrong', plaintextHash)).toBe(false);
    });
  });
});


