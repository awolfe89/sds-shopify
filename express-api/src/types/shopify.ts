export interface ShopifySession {
    shop: string;
    accessToken: string;
    scope: string;
  }
  
  export interface ShopData {
    id: string;
    shopDomain: string;
    plan: 'free' | 'basic' | 'pro' | 'enterprise';
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
  
  // Extend Express Request interface to include shop data
  declare global {
    namespace Express {
      interface Request {
        shopify?: {
          session: ShopifySession;
          shop: ShopData;
        };
      }
    }
  }