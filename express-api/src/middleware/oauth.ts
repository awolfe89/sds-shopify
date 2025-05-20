// express-api/src/middleware/oauth.ts

import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { logger } from '../utils/logger';
import { encrypt, decrypt } from '../utils/encryption';

const prisma = new PrismaClient();

// Interface for augmenting Express Request
declare global {
  namespace Express {
    interface Request {
      shop?: any;
      user?: any;
    }
  }
}

// PKCE Code Verifier generation
export const generateCodeVerifier = (): string => {
  return crypto.randomBytes(64).toString('base64url');
};

// PKCE Code Challenge generation
export const generateCodeChallenge = (verifier: string): string => {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

// Middleware to handle the OAuth install route
export const handleInstall = async (req: Request, res: Response) => {
  try {
    console.log('Install request received:', req.query);
    logger.info(`OAuth install request received for shop: ${req.query.shop}`);
    
    const { shop, code_challenge } = req.query;
    
    if (!shop || typeof shop !== 'string') {
      console.log('Missing shop parameter');
      logger.error('Missing or invalid shop parameter');
      return res.status(400).json({ success: false, error: 'Missing or invalid shop parameter' });
    }
    
    if (!code_challenge || typeof code_challenge !== 'string') {
      console.log('Missing code_challenge parameter');
      logger.error('Missing or invalid code_challenge parameter');
      return res.status(400).json({ success: false, error: 'Missing or invalid code_challenge parameter' });
    }
    
    // Validate the shop domain
    if (!isValidShopDomain(shop)) {
      console.log('Invalid shop domain:', shop);
      logger.error(`Invalid shop domain: ${shop}`);
      return res.status(400).json({ success: false, error: 'Invalid shop domain' });
    }
    
    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');
    console.log('Generated state:', state);
    
    // Store PKCE and state in database session
    const session = await prisma.session.create({
      data: {
        shop,
        state,
        codeVerifier: req.query.code_challenge_method === 'S256' ? null : code_challenge,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('Created session record:', session.id);
    logger.info(`Created session record ${session.id} for shop: ${shop}`);
    
    // Construct OAuth URL
    const apiKey = process.env.SHOPIFY_API_KEY;
    if (!apiKey) {
      console.log('Missing SHOPIFY_API_KEY');
      logger.error('Missing SHOPIFY_API_KEY environment variable');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }
    
    const redirectUri = 'https://forge-trailer-archived-vincent.trycloudflare.com/auth/callback';


    const scopes = process.env.SCOPES || 'write_content,read_content,read_themes,write_themes,read_products,read_orders';
    
    const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&code_challenge=${code_challenge}&code_challenge_method=S256`;
    
    console.log('Redirecting to Shopify auth URL:', authUrl);
    logger.info(`Redirecting to Shopify auth URL for shop: ${shop}`);
    
    // Redirect to auth URL
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error in OAuth install:', error);
    logger.error('Error in OAuth install:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate installation' });
  }
};

// Middleware to handle the OAuth callback
export const handleCallback = async (req: Request, res: Response) => {
  try {
    console.log('Callback request received:', req.query);
    logger.info(`OAuth callback received with params: ${JSON.stringify(req.query)}`);
    
    const { shop, code, state } = req.query;
    
    if (!shop || !code || !state) {
      console.log('Missing required parameters:', { shop, code, state });
      logger.error('Missing required parameters for OAuth callback');
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters for OAuth callback' 
      });
    }
    
    // Find the session with the given state
    const session = await prisma.session.findFirst({
      where: {
        shop: shop as string,
        state: state as string
      }
    });
    
    if (!session) {
      console.log('Invalid state parameter or session not found');
      logger.error(`Invalid state parameter for shop: ${shop}`);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid state parameter' 
      });
    }
    
    console.log('Found session:', session.id);
    logger.info(`Found session ${session.id} for shop: ${shop}`);
    
    // Get the code verifier from the session
    const codeVerifier = session.codeVerifier;
    const code_verifier = req.query.code_verifier;
    
    // Use provided code_verifier or session codeVerifier
    const finalCodeVerifier = code_verifier || codeVerifier;
    
    if (!finalCodeVerifier) {
      console.log('Missing code verifier');
      logger.error('Missing code verifier. Cannot complete OAuth flow.');
      return res.status(400).json({ 
        success: false, 
        error: 'Missing code verifier. Please restart the installation process.' 
      });
    }
    
    console.log('Using code verifier:', finalCodeVerifier);
    
    // Exchange code for access token using PKCE verifier
    const accessToken = await exchangeCodeForToken(
      shop as string, 
      code as string, 
      finalCodeVerifier as string
    );
    
    if (!accessToken) {
      console.log('Failed to get access token');
      logger.error(`Failed to get access token for shop: ${shop}`);
      return res.status(500).json({ success: false, error: 'Failed to authenticate with Shopify' });
    }
    
    console.log('Successfully obtained access token');
    logger.info(`Successfully obtained access token for shop: ${shop}`);
    
    // Encrypt the access token before storing
    const encryptedToken = encrypt(accessToken);
    
    // Store or update shop in the database
    const shopRecord = await prisma.shop.upsert({
      where: { shopDomain: shop as string },
      update: {
        accessToken: encryptedToken,
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        shopDomain: shop as string,
        accessToken: encryptedToken,
        plan: 'free', // Default to free plan
        isActive: true,
        dataRetentionDays: 30, // Default GDPR retention
        aiOptOut: false,       // Default AI setting
        dataRegion: 'us',      // Default region
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('Saved shop record:', shopRecord.id);
    logger.info(`Saved shop record ${shopRecord.id} for shop: ${shop}`);
    
    // Get or create shop owner (in a real implementation, you would get this from Shopify)
    // For this implementation, we'll use a placeholder
    const ownerEmail = 'owner@example.com'; // In real app, get from Shopify API
    
    const ownerUser = await prisma.user.upsert({
      where: { 
        email_shopId: { 
          email: ownerEmail,
          shopId: shopRecord.id
        } 
      },
      update: {
        active: true,
        lastLogin: new Date()
      },
      create: {
        shopId: shopRecord.id,
        email: ownerEmail,
        name: 'Shop Owner',
        role: 'owner',
        active: true,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('Saved user record:', ownerUser.id);
    logger.info(`Saved user record ${ownerUser.id} for shop: ${shop}`);
    
    // Update the session with the token
    await prisma.session.update({
      where: { id: session.id },
      data: {
        accessToken: encryptedToken,
        userId: ownerUser.id,
        updatedAt: new Date()
      }
    });
    
    console.log('Updated session with token');
    
    // Create a JWT session token for the frontend
    const sessionToken = createSessionToken(shopRecord.id, ownerUser.id, shop as string);
    
    // Set token in cookies
    res.cookie('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    console.log('Set session cookie, redirecting to app home');
    logger.info(`Authentication successful for shop: ${shop}`);
    
    // Redirect to app home with shop parameter
    res.redirect(`/?shop=${shop}`);
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    logger.error('Error in OAuth callback:', error);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
};

// Exchange authorization code for access token
async function exchangeCodeForToken(shop: string, code: string, codeVerifier: string): Promise<string | null> {
  try {
    console.log('Exchanging code for token:', { shop, code, codeVerifier });
    
    const apiKey = process.env.SHOPIFY_API_KEY;
    const apiSecret = process.env.SHOPIFY_API_SECRET;
    const redirectUri = `${process.env.HOST}/api/v1/auth/callback`;
    
    if (!apiKey || !apiSecret) {
      console.log('Missing API key or secret');
      logger.error('Missing SHOPIFY_API_KEY or SHOPIFY_API_SECRET environment variables');
      return null;
    }
    
    console.log('API exchange parameters:', {
      client_id: apiKey,
      client_secret: apiSecret,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier
    });
    
    const response = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: apiKey,
      client_secret: apiSecret,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier
    });
    
    console.log('Token exchange response status:', response.status);
    logger.info(`Token exchange successful for shop: ${shop}`);
    
    return response.data.access_token;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    logger.error('Error exchanging code for token:', error);
    return null;
  }
}

// Validate Shopify shop domain
const isValidShopDomain = (shop: string): boolean => {
  // Basic validation: shop must be a valid myshopify.com domain
  const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/;
  return shopRegex.test(shop);
};

// Create a JWT session token
const createSessionToken = (shopId: string, userId: string, shop: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.log('Missing JWT_SECRET');
    logger.error('Missing JWT_SECRET environment variable');
    throw new Error('Server configuration error: Missing JWT_SECRET');
  }
  
  return jwt.sign(
    {
      shopId,
      userId,
      shop
    },
    secret,
    {
      expiresIn: '24h'
    }
  );
};

// Middleware to validate session token
export const validateSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('Validating session');
    
    // Get token from cookies or Authorization header
    const token = req.cookies.sessionToken || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('No session token provided');
      return res.status(401).json({ success: false, error: 'No session token provided' });
    }
    
    // Verify the token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.log('Missing JWT_SECRET');
      logger.error('Missing JWT_SECRET environment variable');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }
    
    const decoded = jwt.verify(token, secret) as any;
    console.log('Decoded token:', decoded);
    
    // Check if the shop is active in our database
    const shop = await prisma.shop.findUnique({
      where: { id: decoded.shopId },
      select: { id: true, shopDomain: true, isActive: true, accessToken: true }
    });
    
    if (!shop || !shop.isActive) {
      console.log('Shop not found or not active:', decoded.shopId);
      return res.status(401).json({ success: false, error: 'Shop is not active' });
    }
    
    // Check if the user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, active: true }
    });
    
    if (!user || !user.active) {
      console.log('User not found or not active:', decoded.userId);
      return res.status(401).json({ success: false, error: 'User is not active' });
    }
    
    // Add shop and user info to request
    req.shop = {
      ...shop,
      accessToken: decrypt(shop.accessToken) // Decrypt token for use
    };
    req.user = user;
    
    console.log('Session validation successful');
    next();
  } catch (error) {
    console.error('Session validation error:', error);
    logger.error('Session validation error:', error);
    return res.status(401).json({ success: false, error: 'Invalid or expired session' });
  }
};

// Refresh token if needed (for long-lived sessions)
export const refreshToken = async (shopId: string): Promise<string | null> => {
  try {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { shopDomain: true, accessToken: true }
    });
    
    if (!shop) {
      console.log('Shop not found for ID:', shopId);
      logger.error(`Shop not found for ID: ${shopId}`);
      return null;
    }
    
    // In actual implementation with offline tokens, you typically don't need to refresh them
    // This is a placeholder for online tokens or if you implement token refresh
    
    return decrypt(shop.accessToken);
  } catch (error) {
    console.error(`Token refresh failed for shop ID ${shopId}:`, error);
    logger.error(`Token refresh failed for shop ID ${shopId}:`, error);
    return null;
  }
};

// Clean up expired sessions
export const cleanupExpiredSessions = async (): Promise<void> => {
  try {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const result = await prisma.session.deleteMany({
      where: {
        updatedAt: {
          lt: twentyFourHoursAgo
        },
        // Only delete sessions that don't have an accessToken
        accessToken: null
      }
    });
    
    console.log(`Cleaned up ${result.count} expired sessions`);
    logger.info(`Cleaned up ${result.count} expired sessions`);
  } catch (error) {
    console.error('Failed to clean up expired sessions:', error);
    logger.error('Failed to clean up expired sessions:', error);
  }
};