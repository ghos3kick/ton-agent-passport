'use client';

import { useTonAddress } from '@tonconnect/ui-react';
import { Container } from '@/components/layout/Container';
import { PassportGrid } from '@/components/passport/PassportGrid';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMyPassports } from '@/hooks/useMyPassports';

export default function MyPassportsPage() {
  const address = useTonAddress();
  const { data: passports, isLoading, error } = useMyPassports();

  return (
    <Container className="py-10">
      <h1 className="text-3xl font-bold text-ap-text mb-2">My Passports</h1>
      <p className="text-ap-text-secondary mb-8">Agent Passports owned by your connected wallet.</p>

      {!address ? (
        <div className="flex flex-col items-center justify-center py-20 gap-6">
          <div className="text-5xl">🔗</div>
          <p className="text-ap-text-secondary text-lg">Connect your wallet to see your passports.</p>
          <ConnectButton />
        </div>
      ) : isLoading ? (
        <PassportGrid loading skeletonCount={3} />
      ) : error ? (
        <EmptyState icon="⚠️" title="Error loading passports" description="Please try again later." />
      ) : !passports || passports.length === 0 ? (
        <EmptyState
          icon="📭"
          title="No passports found"
          description="You don't have any Agent Passports yet."
        />
      ) : (
        <PassportGrid passports={passports} />
      )}
    </Container>
  );
}
