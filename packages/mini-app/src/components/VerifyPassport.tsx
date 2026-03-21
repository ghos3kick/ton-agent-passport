import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldCheck, ShieldX, Search, X } from 'lucide-react';
import { verifyPassport } from '../hooks/useTonApi';
import { calculateTrustScoreLocal } from '../utils/reputation';
import HolographicPassportCard from './HolographicPassportCard';
import type { PassportData } from '../hooks/useTonApi';
import type { ExplorerPassport } from '../hooks/useExplorer';

type VerifyStatus = 'idle' | 'loading' | 'verified' | 'revoked' | 'not-found';

/** Search in /api/passports cache (same source as Explorer) by owner or SBT address */
async function findInCache(address: string): Promise<ExplorerPassport | null> {
  try {
    const res = await fetch('/api/passports?limit=50&offset=0');
    if (!res.ok) return null;
    const data = await res.json();
    const all: ExplorerPassport[] = data.passports || [];
    // fetch all pages if needed
    const pages = [all];
    let offset = all.length;
    while (offset < data.total) {
      const r = await fetch(`/api/passports?limit=50&offset=${offset}`);
      if (!r.ok) break;
      const d = await r.json();
      pages.push(d.passports || []);
      offset += (d.passports || []).length;
      if ((d.passports || []).length === 0) break;
    }
    const passports = pages.flat();
    const normalized = address.trim();
    return passports.find(
      (p: ExplorerPassport) => p.owner === normalized || p.address === normalized
    ) || null;
  } catch {
    return null;
  }
}

function passportToExplorer(p: PassportData): ExplorerPassport {
  const ts = calculateTrustScoreLocal(p);
  return {
    index: p.index,
    address: p.address,
    owner: p.ownerAddress,
    name: `Agent #${p.index}`,
    endpoint: p.endpoint,
    capabilities: p.capabilities,
    metadataUrl: '',
    txCount: p.txCount,
    createdAt: p.createdAt,
    revokedAt: p.revokedAt ?? 0,
    isActive: p.isActive,
    trustScore: { total: ts.total, level: ts.level },
  };
}

export default function VerifyPassport() {
  const location = useLocation();
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<VerifyStatus>('idle');
  const [passport, setPassport] = useState<ExplorerPassport | null>(null);
  const [error, setError] = useState('');

  // Auto-search if address passed from Explorer
  useEffect(() => {
    const state = location.state as { address?: string } | null;
    if (state?.address) {
      setAddress(state.address);
      doVerify(state.address);
      // Clear the state so back navigation doesn't re-trigger
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  async function doVerify(addr: string) {
    const trimmed = addr.trim();
    if (!trimmed) return;

    setStatus('loading');
    setError('');
    setPassport(null);

    try {
      // 1) Try cache (same data source as Explorer — includes resolved names)
      const cached = await findInCache(trimmed);
      if (cached) {
        setPassport(cached);
        setStatus(cached.isActive ? 'verified' : 'revoked');
        return;
      }

      // 2) Fallback: direct blockchain lookup
      const result = await verifyPassport(trimmed);
      if (!result.exists) {
        setStatus('not-found');
      } else {
        setPassport(passportToExplorer(result.passport!));
        setStatus(result.isActive ? 'verified' : 'revoked');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
      setStatus('not-found');
    }
  }

  function handleVerify() {
    doVerify(address);
  }

  return (
    <div className="page page-enter verify-page">
      <h2 className="page-title">Search & Verify</h2>
      <p className="page-subtitle">Find and verify agent passports on-chain</p>

      <div className="search-input-wrapper">
        <Search className="search-icon" />
        <input
          className="search-input"
          placeholder="Enter SBT or owner address..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
        />
        {address && (
          <button className="search-clear" onClick={() => { setAddress(''); setStatus('idle'); setPassport(null); setError(''); }}>
            <X size={16} />
          </button>
        )}
      </div>

      <button
        className="btn-mint"
        onClick={handleVerify}
        disabled={status === 'loading' || !address.trim()}
        style={{ marginBottom: 24 }}
      >
        {status === 'loading' ? 'Searching...' : 'Search'}
      </button>

      {/* Loading */}
      {status === 'loading' && (
        <div style={{ padding: '20px 0' }}>
          <div className="scanning-bar" />
          <div className="scanning-text">Searching blockchain...</div>
        </div>
      )}

      {/* Verified or Revoked — holographic card centered */}
      {(status === 'verified' || status === 'revoked') && passport && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <div style={{ width: '100%', maxWidth: 380 }}>
            <HolographicPassportCard
              passport={passport}
            />
          </div>
        </div>
      )}

      {/* Not Found */}
      {status === 'not-found' && (
        <div className="verify-result">
          <div className="verify-x-mark">
            <ShieldX size={32} color="var(--ap-error)" />
          </div>
          <div className="verify-title error">Not Found</div>
          <div className="verify-subtitle">No passport found for this address</div>
          {error && (
            <p style={{ marginTop: 8, fontSize: 12, color: 'var(--ap-text-muted)' }}>{error}</p>
          )}
        </div>
      )}

      {/* Idle */}
      {status === 'idle' && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <ShieldCheck size={32} strokeWidth={1.5} />
          </div>
          <p className="empty-state-title">Find & Verify</p>
          <p className="empty-state-text">Enter an address to search and verify passport authenticity on-chain</p>
        </div>
      )}

    </div>
  );
}
