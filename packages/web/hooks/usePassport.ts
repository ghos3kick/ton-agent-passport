'use client';

import { useQuery } from '@tanstack/react-query';
import { useSDK } from './useSDK';
import type { AgentPassportData } from '@agent-passport/sdk';

export function usePassport(address: string) {
  const sdk = useSDK();
  return useQuery<AgentPassportData>({
    queryKey: ['passport', address],
    queryFn: () => sdk.getPassport(address),
    enabled: !!address,
    staleTime: 60_000,
  });
}
