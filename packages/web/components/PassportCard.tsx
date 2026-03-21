'use client';

import type { PassportView } from '@/hooks/usePassports';
import { TrustBadge } from './TrustBadge';
import { shortenAddress, formatCapabilities } from '@/lib/utils';
import { EXPLORER_BASE } from '@/lib/constants';

interface PassportCardProps {
  passport: PassportView;
  rank: number;
}

export function PassportCard({ passport, rank }: PassportCardProps) {
  const capabilities = formatCapabilities(passport.capabilities);
  const explorerUrl = `${EXPLORER_BASE}/${passport.address}`;

  return (
    <div className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-lg border border-ap-border bg-ap-secondary hover:border-ap-border-hover transition-all group">
      {/* Rank */}
      <span className="text-sm font-bold text-ap-text-muted font-mono w-6 text-right shrink-0">
        {rank}
      </span>

      {/* Status dot */}
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${passport.isActive ? 'bg-ap-success' : 'bg-ap-error'}`}
        title={passport.isActive ? 'Active' : 'Revoked'}
      />

      {/* Name + capabilities */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-ap-text truncate hover:text-ap-accent transition-colors"
          >
            {passport.name || shortenAddress(passport.address, 6)}
          </a>
          <span className="text-[10px] font-mono text-ap-text-muted shrink-0">#{passport.index}</span>
        </div>
        {capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {capabilities.slice(0, 4).map((cap) => (
              <span key={cap} className="text-[10px] px-1.5 py-0.5 rounded-full bg-ap-purple/15 text-ap-purple border border-ap-purple/20">
                {cap}
              </span>
            ))}
            {capabilities.length > 4 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-ap-text-muted">+{capabilities.length - 4}</span>
            )}
          </div>
        )}
      </div>

      {/* TX count */}
      <div className="text-right shrink-0 hidden sm:block">
        <span className="text-xs font-mono text-ap-text">{passport.txCount}</span>
        <span className="text-[10px] text-ap-text-muted ml-1">tx</span>
      </div>

      {/* Trust */}
      <div className="shrink-0">
        <TrustBadge txCount={passport.txCount} score={passport.trustScore?.total} level={passport.trustScore?.level} />
      </div>

      {/* Bot link */}
      <a
        href={`https://t.me/agent_passport_ton_bot?start=lookup_${passport.address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[11px] text-ap-text-muted hover:text-ap-accent transition-colors shrink-0 hidden sm:block"
      >
        Bot
      </a>
    </div>
  );
}
