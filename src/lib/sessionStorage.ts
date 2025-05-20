import { prisma } from './prisma';
import { encrypt, decrypt } from './encryption';

interface ShopifySession {
  id: string;
  shop: string;
  accessToken: string;
  scope: string;
  isOnline?: boolean;
  expiresAt?: Date;
  userId?: string;
}

// Define the database model type to match the Prisma schema
interface SessionModel {
  id: string;
  shop: string;
  accessToken: string;
  scope: string;
  isOnline: boolean;
  expiresAt: Date | null;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Session storage for Shopify OAuth tokens
 */
export const sessionStorage = {
  /**
   * Store or update a session
   */
  async storeSession(session: ShopifySession): Promise<void> {
    const encryptedToken = encrypt(session.accessToken);
    
    await prisma.session.upsert({
      where: { id: session.id },
      update: {
        shop: session.shop,
        accessToken: encryptedToken,
        scope: session.scope,
        isOnline: session.isOnline || false,
        expiresAt: session.expiresAt,
        userId: session.userId,
        updatedAt: new Date()
      },
      create: {
        id: session.id,
        shop: session.shop,
        accessToken: encryptedToken,
        scope: session.scope,
        isOnline: session.isOnline || false,
        expiresAt: session.expiresAt,
        userId: session.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  },
  
  /**
   * Load a session by ID
   */
  async loadSession(id: string): Promise<ShopifySession | undefined> {
    const session = await prisma.session.findUnique({
      where: { id }
    });
    
    if (!session) {
      return undefined;
    }
    
    return {
      id: session.id,
      shop: session.shop,
      accessToken: decrypt(session.accessToken),
      scope: session.scope,
      isOnline: session.isOnline,
      expiresAt: session.expiresAt || undefined,
      userId: session.userId || undefined
    };
  },
  
  /**
   * Delete a session
   */
  async deleteSession(id: string): Promise<void> {
    await prisma.session.delete({
      where: { id }
    });
  },
  
  /**
   * Load sessions by shop
   */
  async findSessionsByShop(shop: string): Promise<ShopifySession[]> {
    const sessions = await prisma.session.findMany({
      where: { shop }
    });
    
    return sessions.map((session: SessionModel) => ({
      id: session.id,
      shop: session.shop,
      accessToken: decrypt(session.accessToken),
      scope: session.scope,
      isOnline: session.isOnline,
      expiresAt: session.expiresAt || undefined,
      userId: session.userId || undefined
    }));
  }
};