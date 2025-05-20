// express-api/src/utils/encryption.ts

import crypto from 'crypto';

// Get encryption key from environment or use a default (for development only)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 
  'defaultddevelopmenttencryptionnkeyy'; // 32 bytes

// Generate initialization vector
const getIV = () => {
  return crypto.randomBytes(16);
};

// Encrypt data
export const encrypt = (text: string): string => {
  const iv = getIV();
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return IV + encrypted data, both hex encoded
  return `${iv.toString('hex')}:${encrypted}`;
};

// Decrypt data
export const decrypt = (encryptedText: string): string => {
  const [ivHex, encryptedHex] = encryptedText.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};