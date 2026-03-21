export function formatDate(timestamp: number): string {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length <= chars * 2 + 3) return address ?? '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatCapabilities(capabilities: string): string[] {
  if (!capabilities) return [];
  return capabilities
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}
