'use client';

import Link from 'next/link';
import type { AgentPassportData } from '@agent-passport/sdk';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCapabilities } from '@/lib/utils';

interface VerifyResultProps {
  loading: boolean;
  hasPassport?: boolean;
  passports?: AgentPassportData[];
}

export function VerifyResult({ loading, hasPassport, passports }: VerifyResultProps) {
  if (loading) {
    return <Skeleton className="h-32 rounded-2xl" />;
  }

  if (hasPassport === undefined) return null;

  if (!hasPassport || !passports || passports.length === 0) {
    return (
      <div className="rounded-2xl border border-ap-error/20 bg-ap-error/5 p-6">
        <div className="text-xl font-bold text-ap-error mb-2">❌ No Active Passport</div>
        <p className="text-ap-error/80 text-sm">
          This address does not own any active Agent Passport from this registry.
        </p>
      </div>
    );
  }

  // Check if all are revoked
  const revokedPassports = passports.filter((p) => !p.isActive);
  if (revokedPassports.length > 0 && passports.every((p) => !p.isActive)) {
    return (
      <div className="rounded-2xl border border-ap-warning/20 bg-ap-warning/5 p-6">
        <div className="text-xl font-bold text-ap-warning mb-2">⚠️ Passport Revoked</div>
        <p className="text-ap-warning/80 text-sm">
          This address has a passport but it has been revoked.
        </p>
      </div>
    );
  }

  const activePassports = passports.filter((p) => p.isActive);

  return (
    <div className="rounded-2xl border border-ap-success/20 bg-ap-success/5 p-6 space-y-4">
      <div className="text-xl font-bold text-ap-success">✅ Verified Agent</div>
      <p className="text-ap-success/80 text-sm">
        This address owns {activePassports.length} active Agent Passport
        {activePassports.length > 1 ? 's' : ''}:
      </p>
      <ul className="space-y-3">
        {activePassports.map((p) => (
          <li key={p.address} className="bg-ap-secondary rounded-xl p-4 border border-ap-border">
            <div className="font-semibold text-ap-text">#{p.index}</div>
            {p.capabilities && (
              <div className="text-sm text-ap-text-secondary mt-1">
                Capabilities: {formatCapabilities(p.capabilities).join(', ')}
              </div>
            )}
            <Link
              href={`/passport/${p.address}`}
              className="inline-block mt-2 text-xs text-ap-accent hover:underline"
            >
              View Passport →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
