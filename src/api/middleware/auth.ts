import { NextApiRequest, NextApiResponse } from 'next';
import { getCookie } from 'cookies-next';

export function withAuth(handler: any) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const shopOrigin = getCookie('shopOrigin', { req, res }) as string;
    const sessionToken = getCookie('sessionToken', { req, res }) as string;

    if (!shopOrigin || !sessionToken) {
      return res.status(401).json({ 
        success: false, 
        error: {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized access'
        }
      });
    }

    try {
      // TODO: Validate the session token with Shopify
      return handler(req, res);
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(401).json({ 
        success: false, 
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication failed'
        }
      });
    }
  };
}