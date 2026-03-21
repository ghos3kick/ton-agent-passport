'use client';

import { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { VerifyForm } from '@/components/verify/VerifyForm';
import { VerifyResult } from '@/components/verify/VerifyResult';
import { useVerify } from '@/hooks/useVerify';

export default function VerifyPage() {
  const [address, setAddress] = useState('');

  const { data, isLoading } = useVerify(address);

  return (
    <Container className="py-10 max-w-2xl">
      <h1 className="text-3xl font-bold text-ap-text mb-2">Verify Agent</h1>
      <p className="text-ap-text-secondary mb-8">
        Check if a wallet address owns an active Agent Passport.
      </p>

      <div className="rounded-2xl border border-ap-border bg-ap-secondary p-6 shadow-[0_2px_8px_rgba(0,0,0,0.3)] mb-6">
        <VerifyForm onVerify={setAddress} loading={isLoading} />
      </div>

      <VerifyResult
        loading={isLoading && !!address}
        hasPassport={data?.hasPassport}
        passports={data?.passports}
      />
    </Container>
  );
}
