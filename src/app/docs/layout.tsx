import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: 'Neptune',
        url: '/',
      }}
      links={[
        {
          text: 'GitHub',
          url: 'https://github.com/neptune-re/neptune',
        },
      ]}
    >
      {children}
    </DocsLayout>
  );
}
