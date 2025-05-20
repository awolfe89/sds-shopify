import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',
  
  shopify: {
    apiKey: process.env.SHOPIFY_API_KEY || '',
    apiSecret: process.env.SHOPIFY_API_SECRET || '',
    scopes: process.env.SCOPES || 'write_content,read_content',
    host: process.env.HOST || '',
    apiVersion: process.env.SHOPIFY_API_VERSION || '2025-04'
  },
  
  security: {
    sessionSecret: process.env.SESSION_SECRET || 'default_session_secret_for_dev',
    encryptionKey: process.env.ENCRYPTION_KEY || 'default_encryption_key_for_dev'
  },
  
  database: {
    url: process.env.DATABASE_URL || ''
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY || ''
  }
};

export default config;