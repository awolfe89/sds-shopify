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