import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

/**
 * Generate a secure random string for secrets if not provided
 */
function generateSecureString(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Validate required environment variables
 */
function validateEnvVars(variables: string[]): void {
  const missing = variables.filter(variable => !process.env[variable]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Validate critical variables in production
if (process.env.NODE_ENV === 'production') {
  validateEnvVars([
    'SHOPIFY_API_KEY',
    'SHOPIFY_API_SECRET',
    'HOST',
    'SESSION_SECRET',
    'ENCRYPTION_KEY'
  ]);
}

// Parse JSON environment variables
const parseJson = <T>(value: string | undefined, defaultValue: T): T => {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn(`Failed to parse JSON environment variable, using default:`, error);
    return defaultValue;
  }
};

const config = {
  // Node environment
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',
  
  // Server configuration
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || 'http://localhost:3000',
  
  // Shopify API
  shopify: {
    apiKey: process.env.SHOPIFY_API_KEY || '',
    apiSecret: process.env.SHOPIFY_API_SECRET || '',
    scopes: process.env.SCOPES || 'write_content,read_content',
    apiVersion: process.env.SHOPIFY_API_VERSION || '2025-04',
  },
  
  // Security
  security: {
    sessionSecret: process.env.SESSION_SECRET || generateSecureString(),
    encryptionKey: process.env.ENCRYPTION_KEY || generateSecureString(32),
    jwtSecret: process.env.JWT_SECRET || generateSecureString(),
    cookieSecret: process.env.COOKIE_SECRET || generateSecureString(),
    csrfSecret: process.env.CSRF_SECRET || generateSecureString(),
    secureCookies: process.env.NODE_ENV === 'production',
  },
  
  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/shopify_content_automator',
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  // File storage
  storage: {
    type: process.env.FILE_STORAGE_TYPE === 's3' ? 's3' : 'local',
    s3: {
      bucket: process.env.S3_BUCKET || '',
      region: process.env.S3_REGION || 'us-east-1',
    },
    limits: {
      maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
      maxZipSizeMB: parseInt(process.env.MAX_ZIP_SIZE_MB || '50', 10),
      maxBatchSizeMB: parseInt(process.env.MAX_BATCH_SIZE_MB || '100', 10),
    },
  },
  
  // AI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  
  // Security scanning
  security_scanning: {
    enabled: process.env.VIRUS_SCAN_ENABLED === 'true',
    apiKey: process.env.VIRUS_SCAN_API_KEY || '',
  },
  
  // Rate limiting
  rateLimit: parseJson<Record<string, { windowMs: number; max: number }>>(
    process.env.RATE_LIMIT_WINDOWS,
    {
      general: { windowMs: 60000, max: 100 },
      upload: { windowMs: 60000, max: 20 },
    }
  ),
  
  // Monitoring
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN || '',
  },
};

export default config;