// src/pages/api/auth/login.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getIronSession } from 'iron-session';
import { generateCodeVerifier, generateCodeChallenge } from '../../../lib/pkce';

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
      return res.status(400).json({ success: false, error: 'Missing shop parameter' });
    }
    
    console.log('Login request for shop:', shop);
    
    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    
    // Store in session
    session.codeVerifier = codeVerifier;
    session.shop = shop;
    await session.save();
    
// Redirect to backend auth endpoint
const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
const redirectUrl = `${apiUrl}/auth/install?shop=${shop}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    
    console.log('Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in login handler:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
}