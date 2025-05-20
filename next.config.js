/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    images: {
      domains: ['cdn.shopify.com'],
    },
    async headers() {
      return [
        {
          // Apply these headers to all routes
          source: '/:path*',
          headers: [
            {
              key: 'Content-Security-Policy',
              value: "frame-ancestors https://*.myshopify.com https://admin.shopify.com;",
            },
          ],
        },
      ];
    },
  };
  
  module.exports = nextConfig;