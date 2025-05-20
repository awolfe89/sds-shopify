// express-api/src/endpoints/auth.ts

import { Router } from 'express';
import { handleInstall, handleCallback, validateSession } from '../middleware/oauth';

const router = Router();

// Install route
router.get('/install', handleInstall);

// Callback route
router.get('/callback', handleCallback);

router.get('/shopify/callback', (req, res) => {
  // Log the request
  console.log('Received Shopify callback at /shopify/callback', req.query);
  
  // Redirect to the actual callback handler
  const { shop, code, state } = req.query;
  res.redirect(`/api/v1/auth/callback?shop=${shop}&code=${code}&state=${state}`);
});
// Logout route
router.post('/logout', (req, res) => {
  try {
    // Clear cookies
    res.clearCookie('sessionToken');
    
    res.status(200).json({ success: false, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
});

// Test authenticated route
router.get('/verify', validateSession, (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Session is valid',
    shop: req.shop?.shopDomain,
    user: {
      id: req.user?.id,
      role: req.user?.role
    }
  });
});

export default router;