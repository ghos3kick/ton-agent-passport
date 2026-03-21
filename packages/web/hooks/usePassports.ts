'use client';

import { useQuery } from '@tanstack/react-query';
import type { AgentPassportData } from '@agent-passport/sdk';

interface ApiPassport {
  index: number;
  address: string;
  owner: string;
  name?: string;
  endpoint: string;
  capabilities: string;
  metadataUrl: string;
  txCount: number;
  createdAt: number;
  revokedAt: number;
  isActive: boolean;
  trustScore?: { total: number; level: string };
}

interface ApiResponse {
  total: number;
  totalOnChain: number;
  revoked: number;
  offset: number;
  limit: number;
  passports: ApiPassport[];
}

export interface PassportView extends AgentPassportData {
  name?: string;
  trustScore?: { total: number; level: string };
}

function toPassportView(p: ApiPassport): PassportView {
  return {
    address: p.address,
    index: p.index,
    ownerAddress: p.owner,
    collectionAddress: '',
    capabilities: p.capabilities,
    endpoint: p.endpoint,
    metadataUrl: p.metadataUrl,
    txCount: p.txCount,
    createdAt: p.createdAt,
    authorityAddress: '',
    revokedAt: p.revokedAt,
    isActive: p.isActive,
    name: p.name,
    trustScore: p.trustScore,
  };
}

export function usePassports(limit = 12, offset = 0) {
  return useQuery<PassportView[]>({
    queryKey: ['passports', limit, offset],
    queryFn: async () => {
      const res = await fetch(`/api/passports?limit=${limit}&offset=${offset}`);
      if (!res.ok) throw new Error('Failed to fetch passports');
      const data: ApiResponse = await res.json();
      return data.passports.map(toPassportView);
    },
    staleTime: 30_000,
  });
}
