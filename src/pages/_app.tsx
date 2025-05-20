import '@/styles/globals.css';
import { AppProps } from 'next/app';
import { AppProvider } from '@shopify/polaris';
import '@shopify/polaris/build/esm/styles.css';
import enTranslations from '@shopify/polaris/locales/en.json';
import { AppBridgeProvider } from '../components/providers/AppBridgeProvider';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AppBridgeProvider>
      <AppProvider i18n={enTranslations}>
        <Component {...pageProps} />
      </AppProvider>
    </AppBridgeProvider>
  );
}