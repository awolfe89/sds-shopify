import React, { ReactNode } from 'react';
import { Page, Layout, Card } from '@shopify/polaris';

interface PageLayoutProps {
  title: string;
  children: ReactNode;
}

export function PageLayout({ title, children }: PageLayoutProps) {
  return (
    <Page title={title}>
      <Layout>
        <Layout.Section>
          <Card>
            {children}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}