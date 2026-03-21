'use client';

import type { AgentPassportData } from '@agent-passport/sdk';
import { PassportCard } from './PassportCard';
import { Skeleton } from '@/components/ui/Skeleton';

interface PassportGridProps {
  passports?: AgentPassportData[];
  loading?: boolean;
  skeletonCount?: number;
}

export function PassportGrid({ passports, loading, skeletonCount = 6 }: PassportGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!passports || passports.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {passports.map((passport) => (
        <PassportCard key={passport.address} passport={passport} />
      ))}
    </div>
  );
}
