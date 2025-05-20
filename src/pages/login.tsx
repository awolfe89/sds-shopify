// src/pages/login.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Page, Layout, Card, Text, Button, TextField, Banner } from '@shopify/polaris';

export default function Login() {
  const router = useRouter();
  const [shop, setShop] = useState('');
  const [error, setError] = useState('');

  // Check if shop parameter is already in the URL
  useEffect(() => {
    if (router.query.shop) {
      // If shop is in the URL, redirect directly to login endpoint
      const shopDomain = router.query.shop as string;
      localStorage.setItem('shopifyShop', shopDomain);
      window.location.href = `/auth/login?shop=${shopDomain}`;
    }
  }, [router.query.shop]);

  const handleLogin = () => {
    if (!shop) {
      setError('Please enter a shop domain');
      return;
    }
    
    // Clean up the shop domain
    let shopDomain = shop.trim();
    if (!shopDomain.includes('.myshopify.com')) {
      shopDomain = `${shopDomain}.myshopify.com`;
    }
    
    // Store in localStorage for recovery
    localStorage.setItem('shopifyShop', shopDomain);
    
    // Redirect to login
    window.location.href = `/auth/login?shop=${shopDomain}`;
  };

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Card>
            <div style={{ padding: '16px' }}>
              <Text as="h2" variant="headingLg">Login to Shopify Content Automator</Text>
              
              {error && (
                <div style={{ marginBottom: '16px', marginTop: '16px' }}>
                  <Banner tone="critical" onDismiss={() => setError('')}>
                    {error}
                  </Banner>
                </div>
              )}
              
              <div style={{ marginTop: '20px' }}>
                <TextField
                  label="Shop Domain"
                  value={shop}
                  onChange={setShop}
                  placeholder="your-store.myshopify.com"
                  autoComplete="off"
                  helpText="Enter your Shopify store domain"
                />
              </div>
              
              <div style={{ marginTop: '20px' }}>
                <Button variant="primary" onClick={handleLogin}>
                  Login with Shopify
                </Button>
              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}