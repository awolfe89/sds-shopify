import { getCookie } from 'cookies-next';
import axios from 'axios';

const shopifyApiVersion = process.env.SHOPIFY_API_VERSION || '2025-04';

export async function getShopifyGqlClient(req: any, res: any) {
  const shopOrigin = getCookie('shopOrigin', { req, res });
  const accessToken = getCookie('accessToken', { req, res });

  if (!shopOrigin || !accessToken) {
    throw new Error('Shopify auth credentials not found');
  }

  return {
    async query({ data }: { data: string }) {
      const response = await axios({
        method: 'POST',
        url: `https://${shopOrigin}/admin/api/${shopifyApiVersion}/graphql.json`,
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken as string,
        },
        data: {
          query: data,
        },
      });

      return response.data;
    },
  };
}