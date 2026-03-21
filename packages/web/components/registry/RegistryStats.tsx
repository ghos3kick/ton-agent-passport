'use client';

import { useRegistryStats } from '@/hooks/useRegistryStats';
import { Skeleton } from '@/components/ui/Skeleton';

export function RegistryStats() {
  const { data, isLoading, error } = useRegistryStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center text-ap-text-muted py-8">
        Could not load registry stats.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard label="Active Passports" value={String(data.total)} />
      <StatCard label="Total Minted" value={String(data.totalOnChain)} />
      <StatCard label="Revoked" value={String(data.revoked)} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ap-border bg-ap-secondary p-5 shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <div className="text-xs font-medium text-ap-text-muted uppercase tracking-wide mb-1">{label}</div>
      <div className="text-xl font-bold text-ap-text">{value}</div>
    </div>
  );
}
