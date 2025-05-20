import { NextApiRequest, NextApiResponse } from 'next';
import config from './config';

// Simple in-memory storage for rate limiting
// In production, you might want to use Redis
const rateLimitStore = new Map<string, { count: number, resetTime: number }>();

interface RateLimitOptions {
  windowMs?: number; // Window size in milliseconds
  max?: number; // Maximum requests per window
  keyGenerator?: (req: NextApiRequest) => string; // Function to generate unique key
  type?: string; // Rate limit type (used to get config)
}

// Clean up expired rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export function withRateLimit(options: RateLimitOptions = {}) {
  // Get rate limit settings from config or options
  const type = options.type || 'general';
  const windowMs = options.windowMs || config.rateLimit[type]?.windowMs || 60000;
  const max = options.max || config.rateLimit[type]?.max || 100;
  
  // Default key generator uses IP address
  const keyGenerator = options.keyGenerator || ((req: NextApiRequest) => {
    const ip = req.headers['x-forwarded-for'] || 
               req.connection.remoteAddress || 
               'unknown';
    return `${ip}-${req.url}`;
  });
  
  // Return a higher-order function that wraps the handler
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      // Generate key for this request
      const key = keyGenerator(req);
      const now = Date.now();
      
      // Get or create rate limit entry
      let rateLimit = rateLimitStore.get(key);
      if (!rateLimit || rateLimit.resetTime < now) {
        rateLimit = {
          count: 0,
          resetTime: now + windowMs
        };
      }
      
      // Increment count
      rateLimit.count += 1;
      rateLimitStore.set(key, rateLimit);
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - rateLimit.count));
      res.setHeader('X-RateLimit-Reset', rateLimit.resetTime);
      
      // Check if rate limit exceeded
      if (rateLimit.count > max) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
            retryAfter: Math.ceil((rateLimit.resetTime - now) / 1000)
          }
        });
      }
      
      // Continue to handler
      return handler(req, res);
    };
  };
}

// Usage example:
// export default withRateLimit({ type: 'upload' })(
//   async (req, res) => {
//     // Handler code
//   }
// );