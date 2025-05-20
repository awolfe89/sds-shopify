import { NextApiRequest, NextApiResponse } from 'next';
import { createHmac, timingSafeEqual } from 'crypto';
import axios from 'axios';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { shop, hmac, code, state, host } = req.query;

  try {
    // Verify request is from Shopify
    if (!shop || !hmac || !code) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required parameters'
        }
      });
    }

    // Verify HMAC using crypto.timingSafeEqual
    if (!verifyHmac(req.query, process.env.SHOPIFY_API_SECRET!)) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_HMAC',
          message: 'HMAC validation failed'
        }
      });
    }

    // Exchange code for permanent access token
    const { accessToken, scope } = await exchangeCodeForToken(
      shop as string,
      code as string
    );

    // Store shop and accessToken in database
    await storeShopData(shop as string, accessToken, scope);

    // Redirect to app with shop parameter
    const redirectUrl = `/auth/success?shop=${shop}`;
    res.redirect(redirectUrl);
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: error.message || 'An error occurred during authentication'
      }
    });
  }
}

/**
 * Verifies the HMAC from Shopify using crypto.timingSafeEqual
 */
function verifyHmac(query: NextApiRequest['query'], apiSecret: string): boolean {
    // Get hmac from query
    const hmac = query.hmac as string;
    delete query.hmac;
  
    // Sort and stringify query parameters
    const sortedParams = Object.keys(query)
      .sort()
      .reduce<Record<string, string | string[]>>((acc, key) => {
        // Only add defined values to the accumulator
        if (query[key] !== undefined) {
          acc[key] = query[key] as string | string[];
        }
        return acc;
      }, {});
  
    // Convert params to query string format: key=value&key2=value2
    const queryString = Object.entries(sortedParams)
      .map(([key, value]) => `${key}=${Array.isArray(value) ? value[0] : value}`)
      .join('&');
  
    // Generate HMAC
    const generatedHmac = createHmac('sha256', apiSecret)
      .update(queryString)
      .digest('hex');
  
    // Use timing-safe equals to prevent timing attacks
    const hmacBuffer = Buffer.from(hmac);
    const generatedHmacBuffer = Buffer.from(generatedHmac);
  
    // Only compare if lengths match
    return hmacBuffer.length === generatedHmacBuffer.length && 
      timingSafeEqual(hmacBuffer, generatedHmacBuffer);
  }

/**
 * Exchanges temporary code for a permanent access token
 */
async function exchangeCodeForToken(shop: string, code: string): Promise<{ accessToken: string, scope: string }> {
  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  const host = process.env.HOST;

  try {
    const response = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: apiKey,
        client_secret: apiSecret,
        code
      }
    );

    return {
      accessToken: response.data.access_token,
      scope: response.data.scope
    };
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw new Error('Failed to exchange code for access token');
  }
}

/**
 * Stores shop data and access token in database
 */
async function storeShopData(shopDomain: string, accessToken: string, scope: string): Promise<void> {
  try {
    // Get shop data using GraphQL Admin API
    const shopData = await getShopData(shopDomain, accessToken);

    // Store or update shop in database
    await prisma.shop.upsert({
      where: { shopDomain },
      update: {
        accessToken: accessToken, // Store encrypted in production
        plan: 'basic', // Default plan
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        shopDomain,
        accessToken, // Store encrypted in production
        plan: 'basic', // Default plan
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        dataRetentionDays: 30, // GDPR compliance
        aiOptOut: false, // AI training usage
        dataRegion: 'us', // Default data sovereignty
      }
    });

    // Also create a default store owner user record
    // This would be expanded with actual user data from Shopify API
    await prisma.user.upsert({
      where: {
        // Unique constraint on shopId + email would be needed in the schema
        email_shopId: {
          email: 'store-owner@example.com', // Placeholder - would be fetched from Shopify
          shopId: shopDomain,
        }
      },
      update: {
        role: 'owner',
        active: true,
        lastLogin: new Date()
      },
      create: {
        shopId: shopDomain,
        email: 'store-owner@example.com', // Placeholder - would be fetched from Shopify
        name: 'Store Owner', // Placeholder - would be fetched from Shopify
        role: 'owner',
        active: true,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        shopId: shopDomain,
        userId: 'system', // Would use actual user ID in production
        action: 'SHOP_INSTALLED',
        resourceType: 'SHOP',
        resourceId: shopDomain,
        metadata: { scope },
        ipAddress: '0.0.0.0', // Would use actual IP in production
        userAgent: 'System', // Would use actual user agent in production
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error storing shop data:', error);
    throw new Error('Failed to store shop data');
  }
}

/**
 * Fetches shop data from Shopify Admin API
 */
async function getShopData(shop: string, accessToken: string) {
  const apiVersion = process.env.SHOPIFY_API_VERSION || '2025-04';
  
  try {
    const response = await axios.get(
      `https://${shop}/admin/api/${apiVersion}/shop.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.shop;
  } catch (error) {
    console.error('Error fetching shop data:', error);
    throw new Error('Failed to fetch shop data from Shopify');
  }
}