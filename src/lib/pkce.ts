// src/lib/pkce.ts

import crypto from 'crypto';

// Generate a code verifier (random string between 43-128 chars)
export const generateCodeVerifier = (): string => {
  return crypto.randomBytes(64).toString('base64url');
};

// Generate a code challenge from the verifier
export const generateCodeChallenge = (verifier: string): string => {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};