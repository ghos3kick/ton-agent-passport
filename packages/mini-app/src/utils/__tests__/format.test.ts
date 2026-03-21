import { describe, it, expect } from 'vitest';
import { shortenAddress, formatDate, isValidTonAddress } from '../format';

describe('shortenAddress', () => {
  it('should shorten a long address', () => {
    const addr = 'EQDRdykyEDAj9GgM3sPnkj9Y-OM6IG3wX_QmI40emh2HBxZS';
    const short = shortenAddress(addr);
    expect(short).toContain('...');
    expect(short.length).toBeLessThan(addr.length);
  });

  it('should not shorten short strings', () => {
    expect(shortenAddress('EQ123')).toBe('EQ123');
  });

  it('should handle empty string', () => {
    expect(shortenAddress('')).toBe('');
  });

  it('should respect custom chars param', () => {
    const addr = 'EQDRdykyEDAj9GgM3sPnkj9Y-OM6IG3wX_QmI40emh2HBxZS';
    const short = shortenAddress(addr, 8);
    expect(short.length).toBeLessThan(addr.length);
    expect(short).toContain('...');
  });
});

describe('formatDate', () => {
  it('should return N/A for timestamp 0', () => {
    expect(formatDate(0)).toBe('N/A');
  });

  it('should format a valid timestamp', () => {
    // 2024-01-15 00:00:00 UTC
    const ts = 1705276800;
    const result = formatDate(ts);
    expect(result).toContain('2024');
    expect(result).toContain('Jan');
  });
});

describe('isValidTonAddress', () => {
  it('should accept EQ address', () => {
    expect(isValidTonAddress('EQDRdykyEDAj9GgM3sPnkj9Y-OM6IG3wX_QmI40emh2HBxZS')).toBe(true);
  });

  it('should accept UQ address', () => {
    expect(isValidTonAddress('UQDRdykyEDAj9GgM3sPnkj9Y-OM6IG3wX_QmI40emh2HBxZS')).toBe(true);
  });

  it('should accept raw address', () => {
    expect(isValidTonAddress('0:d177293210302f46080cdec3e7923f58f8e33a206df05ff42623d8d1e9a1d870')).toBe(true);
  });

  it('should reject random string', () => {
    expect(isValidTonAddress('not-an-address')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(isValidTonAddress('')).toBe(false);
  });
});
