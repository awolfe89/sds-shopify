// src/pages/_app.tsx
import { AppProps } from 'next/app';
import { AppProvider } from '@shopify/polaris';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import '@shopify/polaris/build/esm/styles.css';
import enTranslations from '@shopify/polaris/locales/en.json';

function MyApp({ Component, pageProps }: AppProps) {
  // Get query parameters from the URL
  const getShopifyConfig = () => {
    if (typeof window === 'undefined') {
      return { apiKey: '', host: '' };
    }

    const searchParams = new URLSearchParams(window.location.search);
    const host = searchParams.get('host') || '';
    
    return {
      apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '',
      host,
      forceRedirect: true
    };
  };

  return (
    <AppBridgeProvider config={getShopifyConfig()}>
      <AppProvider i18n={enTranslations}>
        <Component {...pageProps} />
      </AppProvider>
    </AppBridgeProvider>
  );
}

export default MyApp;