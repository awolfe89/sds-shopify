import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Text, Card, Page, Layout, BlockStack } from '@shopify/polaris';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';

export default function AuthSuccess() {
  const router = useRouter();
  const { shop } = router.query;
  const app = useAppBridge();
  const redirect = Redirect.create(app);

  useEffect(() => {
    if (shop && typeof shop === 'string') {
      // Set cookies for future requests
      document.cookie = `shopOrigin=${shop}; path=/; secure; samesite=none`;
      
      // Redirect to app home
      setTimeout(() => {
        redirect.dispatch(Redirect.Action.APP, '/');
      }, 2000);
    }
  }, [shop, redirect]);

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Card padding="400">
            <BlockStack gap="400">
              <Text variant="headingLg" as="h2">
                Installation Successful!
              </Text>
              <Text as="p">
                Your app has been successfully installed. You will be redirected to the dashboard in a moment.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}