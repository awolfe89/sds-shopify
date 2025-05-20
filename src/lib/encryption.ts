import crypto from 'crypto';
import config from './config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16 bytes
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a string using AES-256-GCM
 */
export function encrypt(text: string): string {
  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher with key, iv, and specify auth tag length
    const cipher = crypto.createCipheriv(
      ALGORITHM, 
      Buffer.from(config.security.encryptionKey), 
      iv,
      { authTagLength: AUTH_TAG_LENGTH }
    );
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get the auth tag
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Return iv + authTag + encrypted (all as hex)
    return iv.toString('hex') + authTag + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts a string encrypted with AES-256-GCM
 */
export function decrypt(encryptedText: string): string {
  try {
    // Extract iv, authTag and encrypted parts
    const iv = Buffer.from(encryptedText.substring(0, IV_LENGTH * 2), 'hex');
    const authTag = Buffer.from(encryptedText.substring(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2), 'hex');
    const encrypted = encryptedText.substring((IV_LENGTH + AUTH_TAG_LENGTH) * 2);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(
      ALGORITHM, 
      Buffer.from(config.security.encryptionKey), 
      iv,
      { authTagLength: AUTH_TAG_LENGTH }
    );
    
    // Set auth tag
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}