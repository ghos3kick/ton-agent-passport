'use client';

import { useEffect, useState } from 'react';
import { TONCONNECT_MANIFEST_URL } from '@/lib/constants';

export function TonConnectProvider({ children }: { children: React.ReactNode }) {
  const [Provider, setProvider] = useState<React.ComponentType<{
    manifestUrl: string;
    children: React.ReactNode;
  }> | null>(null);

  useEffect(() => {
    import('@tonconnect/ui-react').then((mod) => {
      setProvider(() => mod.TonConnectUIProvider);
    });
  }, []);

  if (!Provider) {
    return <>{children}</>;
  }

  return (
    <Provider manifestUrl={TONCONNECT_MANIFEST_URL}>
      {children}
    </Provider>
  );
}
