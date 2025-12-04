import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password using bcrypt.
 * @param plain - The plaintext password to hash
 * @returns A promise resolving to the bcrypt hash string
 */
export async function hashPassword(plain: string): Promise<string> {
  return await bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against a stored hash.
 * Supports both bcrypt hashes (new) and plaintext hashes (legacy) for migration purposes.
 * 
 * @param plain - The plaintext password to verify
 * @param hash - The stored hash (either bcrypt hash or legacy plaintext)
 * @returns A promise resolving to true if password matches, false otherwise
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  // Return false if hash is falsy
  if (!hash) {
    return false;
  }

  // Detect if hash looks like a bcrypt hash
  // Bcrypt hashes start with $2a$, $2b$, or $2y$ followed by cost and salt
  const isBcryptHash = /^\$2[ayb]\$/.test(hash);

  if (isBcryptHash) {
    // Use bcrypt.compare for modern hashed passwords
    return await bcrypt.compare(plain, hash);
  } else {
    // Legacy fallback: plaintext comparison
    // This allows migration from plaintext to bcrypt without breaking existing users
    // Existing test data and legacy records can still authenticate during migration
    return plain === hash;
  }
}

