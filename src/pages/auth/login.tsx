import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Function to generate code verifier
const generateCodeVerifier = (): string => {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, [...array]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

// Function to generate code challenge from verifier
const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export default function Login() {
  const router = useRouter();
  const { shop } = router.query;

  useEffect(() => {
    const initiateAuth = async () => {
      if (shop && typeof window !== 'undefined') {
        try {
          // Generate PKCE values
          const codeVerifier = generateCodeVerifier();
          const codeChallenge = await generateCodeChallenge(codeVerifier);
          
          // Store code verifier in session storage for callback
          sessionStorage.setItem('pkce_code_verifier', codeVerifier);
          
          // Get the API URL from environment variables
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          
          // Redirect to Express API's install endpoint with code challenge
          window.location.href = `${apiUrl}/auth/install?shop=${shop}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
        } catch (error) {
          console.error('Error generating PKCE values:', error);
        }
      }
    };
    
    initiateAuth();
  }, [shop, router]);

  return (
    <div>
      <p>Redirecting to Shopify login...</p>
    </div>
  );
}