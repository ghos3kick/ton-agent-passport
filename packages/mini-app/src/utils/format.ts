export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatDate(timestamp: number): string {
  if (timestamp === 0) return 'N/A';
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function isValidTonAddress(address: string): boolean {
  // Basic validation: base64 or raw format
  return /^(EQ|UQ|0:|kQ|kf)[a-zA-Z0-9_-]{46,48}$/.test(address) ||
    /^-?[0-9]+:[a-fA-F0-9]{64}$/.test(address);
}
