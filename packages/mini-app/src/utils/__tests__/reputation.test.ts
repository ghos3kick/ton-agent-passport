import { describe, it, expect } from 'vitest';
import { calculateTrustScoreLocal } from '../reputation';

describe('Trust Score Calculation', () => {
  it('should return 0 for revoked passport', () => {
    const score = calculateTrustScoreLocal({
      txCount: 10,
      capabilities: 'chat,trade,analyze',
      revokedAt: 1000,
      createdAt: 1000,
      address: '', index: 0, ownerAddress: '', collectionAddress: '',
      endpoint: '', metadataUrl: '', authorityAddress: '', isActive: false,
    });
    expect(score.total).toBe(0);
    expect(score.level).toBe('revoked');
  });

  it('should return 10 for brand new passport (existence only)', () => {
    const score = calculateTrustScoreLocal({
      txCount: 0,
      capabilities: '',
      revokedAt: 0,
      createdAt: Math.floor(Date.now() / 1000), // just created
      address: '', index: 0, ownerAddress: '', collectionAddress: '',
      endpoint: '', metadataUrl: '', authorityAddress: '', isActive: true,
    });
    expect(score.total).toBe(10);
    expect(score.breakdown.existence).toBe(10);
    expect(score.breakdown.activity).toBe(0);
    expect(score.breakdown.capabilities).toBe(0);
  });

  it('should cap activity at 50', () => {
    const score = calculateTrustScoreLocal({
      txCount: 100,
      capabilities: '',
      revokedAt: 0,
      createdAt: Math.floor(Date.now() / 1000),
      address: '', index: 0, ownerAddress: '', collectionAddress: '',
      endpoint: '', metadataUrl: '', authorityAddress: '', isActive: true,
    });
    expect(score.breakdown.activity).toBe(50);
  });

  it('should cap total at 100', () => {
    const score = calculateTrustScoreLocal({
      txCount: 100,
      capabilities: 'a,b,c,d,e,f,g,h',
      revokedAt: 0,
      createdAt: Math.floor(Date.now() / 1000) - 86400 * 365,
      address: '', index: 0, ownerAddress: '', collectionAddress: '',
      endpoint: '', metadataUrl: '', authorityAddress: '', isActive: true,
    });
    expect(score.total).toBeLessThanOrEqual(100);
  });

  it('should count capabilities correctly', () => {
    const score = calculateTrustScoreLocal({
      txCount: 0,
      capabilities: 'chat,reasoning,code-generation',
      revokedAt: 0,
      createdAt: Math.floor(Date.now() / 1000),
      address: '', index: 0, ownerAddress: '', collectionAddress: '',
      endpoint: '', metadataUrl: '', authorityAddress: '', isActive: true,
    });
    expect(score.breakdown.capabilities).toBe(6); // 3 * 2
  });

  it('should handle empty capabilities', () => {
    const score = calculateTrustScoreLocal({
      txCount: 0,
      capabilities: '',
      revokedAt: 0,
      createdAt: Math.floor(Date.now() / 1000),
      address: '', index: 0, ownerAddress: '', collectionAddress: '',
      endpoint: '', metadataUrl: '', authorityAddress: '', isActive: true,
    });
    expect(score.breakdown.capabilities).toBe(0);
  });

  it('should assign correct levels', () => {
    const base = {
      revokedAt: 0,
      createdAt: Math.floor(Date.now() / 1000),
      address: '', index: 0, ownerAddress: '', collectionAddress: '',
      endpoint: '', metadataUrl: '', authorityAddress: '', isActive: true,
    };

    // new: 1-39
    expect(calculateTrustScoreLocal({ ...base, txCount: 0, capabilities: 'a' }).level).toBe('new');
    // trusted: 40-59
    expect(calculateTrustScoreLocal({ ...base, txCount: 6, capabilities: 'a,b,c' }).level).toBe('trusted');
    // verified: 60-79
    expect(calculateTrustScoreLocal({ ...base, txCount: 10, capabilities: 'a,b,c' }).level).toBe('verified');
    // elite: 80+
    expect(calculateTrustScoreLocal({ ...base, txCount: 10, capabilities: 'a,b,c,d,e', createdAt: Math.floor(Date.now() / 1000) - 86400 * 30 }).level).toBe('elite');
  });
});

describe('Anti-Abuse: Weighted Scoring', () => {
  const base = {
    revokedAt: 0,
    createdAt: Math.floor(Date.now() / 1000),
    address: '', index: 0, ownerAddress: '', collectionAddress: '',
    endpoint: '', metadataUrl: '', authorityAddress: '', isActive: true,
    capabilities: '',
  };

  it('should weight volume higher than count', () => {
    // Same tx count, different volumes — volume should make the difference
    const lowVolume = calculateTrustScoreLocal({ ...base, txCount: 20, txVolume: 1 });
    const highVolume = calculateTrustScoreLocal({ ...base, txCount: 20, txVolume: 100 });

    // Higher volume with same count should score better
    expect(highVolume.breakdown.activity).toBeGreaterThan(lowVolume.breakdown.activity);
  });

  it('should fall back to count-only when no volume data', () => {
    const withoutVolume = calculateTrustScoreLocal({ ...base, txCount: 5 });
    expect(withoutVolume.breakdown.activity).toBe(25); // 5 * 5 = 25
  });

  it('should handle zero txCount gracefully', () => {
    const score = calculateTrustScoreLocal({ ...base, txCount: 0, txVolume: 0 });
    expect(score.total).toBe(10); // existence only
    expect(score.breakdown.activity).toBe(0);
  });

  it('should use log scaling for volume (diminishing returns)', () => {
    const small = calculateTrustScoreLocal({ ...base, txCount: 50, txVolume: 10 });
    const large = calculateTrustScoreLocal({ ...base, txCount: 50, txVolume: 100 });
    const huge = calculateTrustScoreLocal({ ...base, txCount: 50, txVolume: 1000 });

    // Each 10x increase gives less marginal activity score
    const diff1 = large.breakdown.activity - small.breakdown.activity;
    const diff2 = huge.breakdown.activity - large.breakdown.activity;
    expect(diff2).toBeLessThanOrEqual(diff1);
  });

  it('should not exceed activity cap of 50 with volume', () => {
    const score = calculateTrustScoreLocal({ ...base, txCount: 200, txVolume: 5000 });
    expect(score.breakdown.activity).toBeLessThanOrEqual(50);
  });
});
