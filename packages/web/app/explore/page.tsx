'use client';

import { useState } from 'react';
import { ExplorerHeader } from '@/components/ExplorerHeader';
import { PassportCard } from '@/components/PassportCard';
import { usePassports } from '@/hooks/usePassports';
import type { PassportView } from '@/hooks/usePassports';

const PAGE_SIZE = 12;

export default function ExplorePage() {
  const [offset, setOffset] = useState(0);
  const [allPassports, setAllPassports] = useState<PassportView[]>([]);

  const { data, isLoading, isFetching } = usePassports(PAGE_SIZE, offset);

  const combined = offset === 0 ? (data ?? []) : [...allPassports, ...(data ?? [])];
  const hasMore = data && data.length === PAGE_SIZE;

  const handleLoadMore = () => {
    setAllPassports(combined);
    setOffset((prev) => prev + PAGE_SIZE);
  };

  return (
    <div className="min-h-screen">
      <ExplorerHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-2xl sm:text-3xl font-bold text-ap-text mb-1">
            Registered Passports
          </h1>
          <p className="text-ap-text-secondary text-sm">
            All AI agent identities on TON blockchain
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg animate-shimmer" />
            ))}
          </div>
        ) : combined.length === 0 ? (
          <div className="text-center py-20 text-ap-text-muted">
            <p>No passports registered yet.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {combined.map((passport, i) => (
                <div
                  key={passport.address}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(i, 5) * 0.04}s` }}
                >
                  <PassportCard passport={passport} rank={i + 1} />
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isFetching}
                  className="rounded-lg border border-ap-border bg-ap-secondary px-6 py-2.5 text-sm font-medium text-ap-text-secondary hover:border-ap-accent/30 hover:text-ap-text disabled:opacity-40 transition-all"
                >
                  {isFetching ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-ap-divider py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-ap-text-muted">
          <span>Agent Passport Registry</span>
          <span className="font-mono">testnet</span>
        </div>
      </footer>
    </div>
  );
}
