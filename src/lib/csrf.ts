import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { createHash, timingSafeEqual } from 'crypto';
import config from './config';
import { nanoid } from 'nanoid';
import { getCookie, setCookie } from 'cookies-next';

// CSRF protection middleware
export function withCsrf(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Skip CSRF check for GET requests
    if (req.method === 'GET') {
      return handler(req, res);
    }
    
    // For any other method, verify CSRF token
    const csrfTokenFromHeader = req.headers['x-csrf-token'] as string;
    const csrfTokenFromCookie = getCookie('csrfToken', { req, res }) as string;
    
    if (!csrfTokenFromCookie || !csrfTokenFromHeader) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_TOKEN_MISSING',
          message: 'CSRF token missing'
        }
      });
    }
    
    // Generate hash of cookie token using the secret
    const expectedHash = createHash('sha256')
      .update(`${csrfTokenFromCookie}${config.security.csrfSecret}`)
      .digest();
    
    // Convert header token to buffer
    const actualHash = Buffer.from(csrfTokenFromHeader, 'hex');
    
    // Compare using timing-safe equals
    if (
      !timingSafeEqual(expectedHash, actualHash) ||
      expectedHash.length !== actualHash.length
    ) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_TOKEN_INVALID',
          message: 'CSRF token invalid'
        }
      });
    }
    
    // If valid, proceed to handler
    return handler(req, res);
  };
}

// Generate CSRF token
export function generateCsrfToken(req: NextApiRequest, res: NextApiResponse): string {
  // Generate a random token
  const csrfTokenValue = nanoid(32);
  
  // Store in cookie (HttpOnly for security)
  setCookie('csrfToken', csrfTokenValue, {
    req,
    res,
    httpOnly: true,
    secure: config.security.secureCookies,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/'
  });
  
  // Return hashed version to be sent in header
  return createHash('sha256')
    .update(`${csrfTokenValue}${config.security.csrfSecret}`)
    .digest('hex');
}