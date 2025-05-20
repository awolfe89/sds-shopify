// src/pages/index.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  Banner
} from '@shopify/polaris';
import axios from 'axios';

export default function Home() {
  const router = useRouter();
  const { shop } = router.query;
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // If there's no shop parameter, try to recover from localStorage or redirect to login
    if (!shop && typeof window !== 'undefined') {
      const storedShop = localStorage.getItem('shopifyShop');
      if (storedShop) {
        // If we have a stored shop, add it to the URL
        router.replace(`${router.pathname}?shop=${storedShop}`);
      } else {
        // No shop parameter and none stored, redirect to login
        router.push('/login');
      }
      return; // Exit early, we'll come back after the redirect
    }

    // Check if the user is authenticated
    const checkAuth = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await axios.get(`${apiUrl}/auth/verify`, {
          withCredentials: true
        });

        if (response.data.success) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
        setIsAuthenticated(false);
        setError('Authentication failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (shop) {
      // Save shop to localStorage for recovery
      if (typeof window !== 'undefined') {
        localStorage.setItem('shopifyShop', shop as string);
      }
      checkAuth();
    } else {
      setIsLoading(false);
    }
  }, [shop, router]);

// Redirect to login if not authenticated
const handleLogin = () => {
  if (shop) {
    // Use the API URL for authentication
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    window.location.href = `${apiUrl}/api/auth/install?shop=${shop}`;
  } else {
    // If no shop parameter, redirect to login page
    router.push('/login');
  }
};

  if (isLoading) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ padding: '16px' }}>
                <Text as="p" variant="bodyMd">Loading...</Text>
                <Text as="p" variant="bodyMd">
                  Debug info: Shop parameter: {shop || 'Not found'}
                </Text>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (!isAuthenticated) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ padding: '16px' }}>
                <Text as="h2" variant="headingLg">Authentication Required</Text>
                <Text as="p" variant="bodyMd">
                  You need to authenticate with Shopify to use this app.
                </Text>
                <Text as="p" variant="bodyMd">
                  Shop: {shop || 'Not specified'}
                </Text>
                
                {error && (
                  <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                    <Banner tone="critical" onDismiss={() => setError('')}>
                      {error}
                    </Banner>
                  </div>
                )}
                
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

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Card>
            <div style={{ padding: '16px' }}>
              <Text as="h2" variant="headingLg">Welcome to the Content Automator</Text>
              <Text as="p" variant="bodyMd">
                Start by uploading a document to convert it to a blog post or page.
              </Text>
              <div style={{ marginTop: '20px' }}>
                <Button variant="primary">Upload Document</Button>
              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}