'use client';

import { useQuery } from '@tanstack/react-query';

interface RegistryStats {
  total: number;
  totalOnChain: number;
  revoked: number;
}

export function useRegistryStats() {
  return useQuery<RegistryStats>({
    queryKey: ['registry-stats'],
    queryFn: async () => {
      const res = await fetch('/api/passports?limit=0');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      return {
        total: data.total ?? 0,
        totalOnChain: data.totalOnChain ?? 0,
        revoked: data.revoked ?? 0,
      };
    },
    staleTime: 30_000,
  });
}
