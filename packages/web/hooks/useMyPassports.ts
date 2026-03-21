'use client';

import { useQuery } from '@tanstack/react-query';
import { useTonAddress } from '@tonconnect/ui-react';
import { useSDK } from './useSDK';
import type { AgentPassportData } from '@agent-passport/sdk';

export function useMyPassports() {
  const address = useTonAddress();
  const sdk = useSDK();
  return useQuery<AgentPassportData[]>({
    queryKey: ['my-passports', address],
    queryFn: () => sdk.getPassportsByOwner(address),
    enabled: !!address,
    staleTime: 60_000,
  });
}
