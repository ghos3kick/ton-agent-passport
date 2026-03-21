'use client';

import { useQuery } from '@tanstack/react-query';
import { useSDK } from './useSDK';
import type { AgentPassportData } from '@agent-passport/sdk';

export interface VerifyResult {
  hasPassport: boolean;
  passports: AgentPassportData[];
}

export function useVerify(address: string) {
  const sdk = useSDK();
  return useQuery<VerifyResult>({
    queryKey: ['verify', address],
    queryFn: async () => {
      const passports = await sdk.getPassportsByOwner(address);
      const active = passports.filter((p) => p.isActive);
      return { hasPassport: active.length > 0, passports };
    },
    enabled: !!address,
    staleTime: 60_000,
  });
}
