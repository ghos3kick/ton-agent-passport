import { describe, it, expect } from 'vitest';
import { validateForm } from '../validation';

describe('Mint Form Validation', () => {
  const validForm = {
    name: 'Atlas AI',
    endpoint: 'https://api.atlas-agent.ai/v1',
    metadata: 'https://example.com/meta.json',
  };
  const validCaps = ['DeFi'];

  it('should pass valid form', () => {
    const result = validateForm(validForm, validCaps);
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('should reject empty name', () => {
    const result = validateForm({ ...validForm, name: '' }, validCaps);
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('should reject name < 3 chars', () => {
    const result = validateForm({ ...validForm, name: 'AB' }, validCaps);
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('should reject name > 50 chars', () => {
    const result = validateForm({ ...validForm, name: 'A'.repeat(51) }, validCaps);
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('should reject name with special chars', () => {
    const result = validateForm({ ...validForm, name: '<script>alert(1)</script>' }, validCaps);
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('should reject invalid endpoint URL', () => {
    const result = validateForm({ ...validForm, endpoint: 'not a url' }, validCaps);
    expect(result.valid).toBe(false);
    expect(result.errors.endpoint).toBeDefined();
  });

  it('should reject ftp:// endpoint', () => {
    const result = validateForm({ ...validForm, endpoint: 'ftp://files.example.com' }, validCaps);
    expect(result.valid).toBe(false);
    expect(result.errors.endpoint).toBeDefined();
  });

  it('should accept http:// endpoint', () => {
    const result = validateForm({ ...validForm, endpoint: 'http://localhost:3000' }, validCaps);
    expect(result.valid).toBe(true);
  });

  it('should reject empty capabilities', () => {
    const result = validateForm(validForm, []);
    expect(result.valid).toBe(false);
    expect(result.errors.capabilities).toBeDefined();
  });

  it('should accept empty metadata (optional)', () => {
    const result = validateForm({ ...validForm, metadata: '' }, validCaps);
    expect(result.valid).toBe(true);
  });

  it('should reject invalid metadata URL', () => {
    const result = validateForm({ ...validForm, metadata: 'not a url' }, validCaps);
    expect(result.valid).toBe(false);
    expect(result.errors.metadata).toBeDefined();
  });

  it('should reject endpoint > 256 chars', () => {
    const result = validateForm({ ...validForm, endpoint: 'https://x.co/' + 'a'.repeat(250) }, validCaps);
    expect(result.valid).toBe(false);
  });

  it('should reject empty endpoint', () => {
    const result = validateForm({ ...validForm, endpoint: '' }, validCaps);
    expect(result.valid).toBe(false);
    expect(result.errors.endpoint).toBeDefined();
  });
});
