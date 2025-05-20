import { useAppBridge as useOriginalAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { AppBridgeState, ClientApplication } from '@shopify/app-bridge';

export function useAppBridge() {
  const app = useOriginalAppBridge();
  
  const redirect = Redirect.create(app);

  return { app, redirect };
}