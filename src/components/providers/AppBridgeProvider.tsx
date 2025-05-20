// src/components/providers/AppBridgeProvider.tsx
import { useMemo, ReactNode } from 'react';
import { Provider } from '@shopify/app-bridge-react';
import { useRouter } from 'next/router';
import { AppProvider } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';

interface AppBridgeProviderProps {
  children: ReactNode;
}

export function AppBridgeProvider({ children }: AppBridgeProviderProps) {
  const router = useRouter();

  // Check if we're in a Shopify embedded app context
  const isEmbeddedApp = useMemo(() => {
    // Only initialize App Bridge if we have both host and shop
    if (router.query.host && router.query.shop) {
      try {
        return true;
      } catch (error) {
        console.error('Error validating Shopify context:', error);
        return false;
      }
    }
    return false;
  }, [router.query]);

  // Only try to initialize App Bridge in a valid Shopify context
  const appBridgeConfig = useMemo(() => {
    if (!isEmbeddedApp) return null;

    const host = router.query.host as string;
    const shop = router.query.shop as string;
    
    return {
      host,
      apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '',
      forceRedirect: true
    };
  }, [isEmbeddedApp, router.query]);

  // When not in a Shopify context, just render the children without App Bridge
  if (!appBridgeConfig) {
    return (
      <AppProvider i18n={enTranslations}>
        {children}
      </AppProvider>
    );
  }

  // In a valid Shopify context, initialize App Bridge
  return (
    <Provider config={appBridgeConfig}>
      <AppProvider i18n={enTranslations}>{children}</AppProvider>
    </Provider>
  );
}