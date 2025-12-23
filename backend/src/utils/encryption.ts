/**
 * 🔐 AES-256 Encryption/Decryption Utility
 * Used for encrypting sensitive data before database storage
 */
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES block size

// Get encryption key from environment
const getEncryptionKey = (): Buffer => {
    const key = process.env.ENCRYPTION_KEY;

    if (!key) {
        console.warn('⚠️ ENCRYPTION_KEY not set! Using fallback (NOT SECURE FOR PRODUCTION)');
        // Fallback key for development - NEVER use in production!
        return crypto.createHash('sha256').update('pairly-dev-key').digest();
    }

    // Key should be 32 bytes (64 hex characters)
    if (key.length === 64) {
        return Buffer.from(key, 'hex');
    }

    // If not hex, hash it to get consistent 32 bytes
    return crypto.createHash('sha256').update(key).digest();
};

/**
 * Encrypt a string using AES-256-CBC
 * @param text - Plain text to encrypt
 * @returns Encrypted string (iv:encrypted format) or null if empty
 */
export const encrypt = (text: string | null | undefined): string | null => {
    if (!text) return null;

    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Return: IV + ':' + encrypted data
        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        console.error('❌ Encryption error:', error);
        return null;
    }
};

/**
 * Decrypt an encrypted string
 * @param encryptedText - Encrypted string (iv:encrypted format)
 * @returns Decrypted plain text or null if invalid
 */
export const decrypt = (encryptedText: string | null | undefined): string | null => {
    if (!encryptedText) return null;

    try {
        // Check if it looks like encrypted data (has the right format)
        if (!encryptedText.includes(':') || encryptedText.length < 34) {
            // Return as-is if not encrypted (for backward compatibility)
            return encryptedText;
        }

        const key = getEncryptionKey();
        const parts = encryptedText.split(':');

        if (parts.length !== 2) {
            return encryptedText; // Not our format, return as-is
        }

        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];

        if (iv.length !== IV_LENGTH) {
            return encryptedText; // Invalid IV, return as-is
        }

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        // If decryption fails, return original (might be unencrypted legacy data)
        console.warn('⚠️ Decryption failed, returning original:', error);
        return encryptedText;
    }
};

/**
 * Check if a string appears to be encrypted
 * @param text - String to check
 * @returns true if it looks like encrypted data
 */
export const isEncrypted = (text: string | null | undefined): boolean => {
    if (!text) return false;

    // Our format: 32 hex chars (IV) + ':' + encrypted data
    if (!text.includes(':') || text.length < 34) return false;

    const parts = text.split(':');
    if (parts.length !== 2) return false;

    // First part should be 32 hex characters (16 bytes IV)
    return /^[0-9a-f]{32}$/i.test(parts[0]);
};

/**
 * Generate a new encryption key (for setup)
 * @returns 32-byte key as hex string
 */
export const generateKey = (): string => {
    return crypto.randomBytes(32).toString('hex');
};
