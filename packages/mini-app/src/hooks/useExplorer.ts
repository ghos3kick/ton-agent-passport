import { useState, useCallback } from 'react';

export interface ExplorerPassport {
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
  trustScore: {
    total: number;
    level: string;
  };
}

interface ExplorerState {
  passports: ExplorerPassport[];
  total: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
}

export function useExplorer() {
  const [state, setState] = useState<ExplorerState>({
    passports: [],
    total: 0,
    loading: false,
    error: null,
    hasMore: true,
  });

  const fetchPassports = useCallback(async (offset = 0, reset = false) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`/api/passports?limit=20&offset=${offset}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch');

      setState(prev => ({
        passports: reset ? data.passports : [...prev.passports, ...data.passports],
        total: data.total,
        loading: false,
        error: null,
        hasMore: offset + data.passports.length < data.total,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setState(prev => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  const loadMore = useCallback(() => {
    if (!state.loading && state.hasMore) {
      fetchPassports(state.passports.length);
    }
  }, [state.loading, state.hasMore, state.passports.length, fetchPassports]);

  return { ...state, fetchPassports, loadMore };
}
