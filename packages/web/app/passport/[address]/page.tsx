'use client';

import { use } from 'react';
import { Container } from '@/components/layout/Container';
import { PassportDetail } from '@/components/passport/PassportDetail';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePassport } from '@/hooks/usePassport';

interface Props {
  params: Promise<{ address: string }>;
}

export default function PassportPage({ params }: Props) {
  const { address } = use(params);
  const { data: passport, isLoading, error } = usePassport(address);

  return (
    <Container className="py-10 max-w-3xl">
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : error || !passport ? (
        <EmptyState
          icon="🔍"
          title="Passport not found"
          description={`No passport found at address: ${address}`}
        />
      ) : (
        <PassportDetail passport={passport} />
      )}
    </Container>
  );
}
