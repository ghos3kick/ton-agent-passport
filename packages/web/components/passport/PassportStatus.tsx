'use client';

import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';

interface PassportStatusProps {
  isActive: boolean;
  revokedAt: number;
}

export function PassportStatus({ isActive, revokedAt }: PassportStatusProps) {
  if (isActive) {
    return <Badge variant="success">✅ Active</Badge>;
  }
  return (
    <Badge variant="destructive">
      ❌ Revoked {revokedAt ? formatDate(revokedAt) : ''}
    </Badge>
  );
}
