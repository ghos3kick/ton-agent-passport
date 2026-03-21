import { useState } from 'react';
import { Search } from 'lucide-react';
import { getPassportByAddress, getPassportsByOwner } from '../hooks/useTonApi';
import type { PassportData } from '../hooks/useTonApi';
import PassportCard from './PassportCard';
import TrustScore from './TrustScore';
import { calculateTrustScoreLocal } from '../utils/reputation';

export default function PassportViewer() {
  const [address, setAddress] = useState('');
  const [passports, setPassports] = useState<PassportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    const trimmed = address.trim();
    if (!trimmed) return;

    setLoading(true);
    setError('');
    setPassports([]);
    setSearched(true);

    try {
      try {
        const passport = await getPassportByAddress(trimmed);
        setPassports([passport]);
        setLoading(false);
        return;
      } catch {
        // Not a passport address, try as owner
      }

      const ownerPassports = await getPassportsByOwner(trimmed);
      setPassports(ownerPassports);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to search');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page page-enter">
      <h2 className="page-title">Search</h2>
      <p className="page-subtitle">Find an agent passport on TON</p>

      <div className="search-input-wrapper">
        <Search className="search-icon" />
        <input
          className="search-input"
          placeholder="Enter TON address..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
      </div>

      <button
        className="btn-mint"
        onClick={handleSearch}
        disabled={loading || !address.trim()}
        style={{ marginBottom: 24 }}
      >
        {loading ? (
          <><div className="spinner" style={{ marginRight: 8 }} /> Searching...</>
        ) : 'Search'}
      </button>

      {error && <div className="status error">{error}</div>}

      {loading && (
        <div style={{ padding: '20px 0' }}>
          <div className="scanning-bar" />
          <div className="scanning-text">Searching blockchain...</div>
        </div>
      )}

      {!loading && searched && passports.length === 0 && !error && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Search size={32} strokeWidth={1.5} />
          </div>
          <p className="empty-state-title">No Passports Found</p>
          <p className="empty-state-text">No agent passports found for this address</p>
        </div>
      )}

      {!loading && !searched && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Search size={32} strokeWidth={1.5} />
          </div>
          <p className="empty-state-title">Find an Agent</p>
          <p className="empty-state-text">Enter a TON address to look up their passport</p>
        </div>
      )}

      {passports.map((p) => {
        const ts = calculateTrustScoreLocal(p);
        return (
          <div key={p.address} className="flex-col gap-16" style={{ marginBottom: 16 }}>
            <PassportCard passport={p} animate />
            <TrustScore score={ts.total} level={ts.level} breakdown={ts.breakdown} />
          </div>
        );
      })}
    </div>
  );
}
