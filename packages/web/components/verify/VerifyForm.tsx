'use client';

import { useState } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { isValidTonAddress } from '@agent-passport/sdk';

interface VerifyFormProps {
  onVerify: (address: string) => void;
  loading?: boolean;
}

export function VerifyForm({ onVerify, loading }: VerifyFormProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const walletAddress = useTonAddress();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const addr = input.trim();
    if (!addr) {
      setError('Please enter an address');
      return;
    }
    if (!isValidTonAddress(addr)) {
      setError('Invalid TON address');
      return;
    }
    setError('');
    onVerify(addr);
  };

  const handleUseWallet = () => {
    if (walletAddress) {
      setInput(walletAddress);
      setError('');
      onVerify(walletAddress);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-ap-text-secondary mb-1">
          TON Wallet Address
        </label>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="EQBx..."
          className="w-full rounded-lg border border-ap-border bg-ap-input px-4 py-2.5 font-mono text-sm text-ap-text placeholder:text-ap-text-muted focus:outline-none focus:ring-2 focus:ring-ap-accent/40 focus:border-ap-accent/40 transition-colors"
        />
        {error && <p className="mt-1 text-sm text-ap-error">{error}</p>}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-ap-accent text-white px-4 py-2.5 font-medium hover:bg-ap-accent-hover hover:-translate-y-px hover:shadow-lg hover:shadow-ap-accent/20 disabled:opacity-40 transition-all"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
        {walletAddress && (
          <button
            type="button"
            onClick={handleUseWallet}
            className="rounded-lg border border-ap-border bg-ap-elevated px-4 py-2.5 text-sm font-medium text-ap-text-secondary hover:border-ap-accent/30 transition-colors"
          >
            Use connected wallet
          </button>
        )}
      </div>
    </form>
  );
}
