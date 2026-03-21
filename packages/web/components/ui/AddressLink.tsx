'use client';

import { CopyButton } from './CopyButton';
import { shortenAddress } from '@/lib/utils';
import { EXPLORER_BASE } from '@/lib/constants';

interface AddressLinkProps {
  address: string;
  shorten?: boolean;
  className?: string;
}

export function AddressLink({ address, shorten = true, className = '' }: AddressLinkProps) {
  if (!address) return <span className="text-ap-text-muted">—</span>;
  const display = shorten ? shortenAddress(address) : address;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <a
        href={`${EXPLORER_BASE}/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-sm text-ap-accent hover:underline"
      >
        {display}
      </a>
      <CopyButton text={address} />
    </span>
  );
}
