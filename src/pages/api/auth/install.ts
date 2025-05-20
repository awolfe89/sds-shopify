import { NextApiRequest, NextApiResponse } from 'next';
import { nanoid } from 'nanoid';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { shop } = req.query;

  if (!shop) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_SHOP',
        message: 'Shop parameter is required'
      }
    });
  }

  // Shopify OAuth endpoint
  const shopifyDomain = shop.toString().includes('.myshopify.com') 
    ? shop 
    : `${shop}.myshopify.com`;

  // Generate a nonce for CSRF protection
  const state = nanoid();

  // Store state in a cookie or session for verification later
  res.setHeader('Set-Cookie', `state=${state}; Path=/; HttpOnly; SameSite=Lax; Secure`);
  
  // Prepare OAuth URL - use PKCE when possible in production
  const redirectUri = `${process.env.HOST}/auth/callback`;
  const scopes = process.env.SCOPES || 'write_content,read_content';
  const apiKey = process.env.SHOPIFY_API_KEY;
  
  const oauthUrl = `https://${shopifyDomain}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  
  // Redirect to Shopify OAuth screen
  res.redirect(oauthUrl);
}