// src/pages/api/auth/install.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { IronSession, getIronSession } from 'iron-session';
import { generateCodeVerifier, generateCodeChallenge } from '../../lib/pkce';

// Define session options
const sessionOptions = {
    password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long',
    cookieName: 'shopify_app_session',
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      httpOnly: true,
    },
  };
  
  // For TypeScript to recognize session
  interface SessionData {
    codeVerifier?: string;
    shop?: string;
  }
  
  export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
  ) {
    try {
      // Only allow GET requests
      if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
      }
      
      // Get the iron session
      const session = await getIronSession<SessionData>(req, res, sessionOptions);
      
      const { shop } = req.query;
      
      if (!shop || typeof shop !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing or invalid shop parameter' });
      }
      
      // Validate the shop domain
      if (!/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/.test(shop)) {
        return res.status(400).json({ success: false, error: 'Invalid shop domain' });
      }
      
      // Generate PKCE values
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      
      // Store in session
      session.codeVerifier = codeVerifier;
      session.shop = shop;
      await session.save();
      
      // Prepare redirect to Express backend
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const redirectUrl = `${backendUrl}/auth/install?shop=${shop}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Error in install handler:', error);
      res.status(500).json({ success: false, error: 'Failed to initiate installation' });
    }
  }