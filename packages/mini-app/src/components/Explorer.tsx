import { useEffect, useState } from 'react';
import { useExplorer, type ExplorerPassport } from '../hooks/useExplorer';
import { ArrowLeft } from 'lucide-react';
import PassportProfile from './PassportProfile';
import RobotAvatar from './RobotAvatar';
import MiniScore from './MiniScore';

interface ExplorerProps {
  onBack: () => void;
  onSelectPassport?: (ownerAddress: string) => void;
}

const shortAddr = (addr: string) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

const Explorer = ({ onBack, onSelectPassport }: ExplorerProps) => {
  const { passports, total, loading, error, hasMore, fetchPassports, loadMore } = useExplorer();
  const [selectedPassport, setSelectedPassport] = useState<ExplorerPassport | null>(null);

  useEffect(() => {
    fetchPassports(0, true);
  }, [fetchPassports]);

  return (
    <div className="explorer">
      {/* Header */}
      <div className="explorer-header">
        <button className="explorer-back" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="page-title" style={{ fontSize: 20, marginBottom: 0 }}>Passport Registry</h2>
          <p style={{ fontSize: 12, color: 'var(--ap-text-secondary)', margin: 0 }}>{total} agents registered</p>
        </div>
      </div>

      {/* List */}
      <div className="explorer-list">
        {passports.map((p, i) => (
          <div
            key={p.address || i}
            className="explorer-item"
            style={{ animation: `fade-in-up 0.4s ease ${Math.min(i, 10) * 50}ms both` }}
            onClick={() => setSelectedPassport(p)}
          >
            <RobotAvatar address={p.owner} size={40} />
            <div className="explorer-info">
              <div className="explorer-name">
                {p.name || 'Unknown Agent'}
              </div>
              <div className="explorer-address">{shortAddr(p.owner)}</div>
              {p.capabilities && p.capabilities.split(',').filter(Boolean).length > 0 && (
                <div className="explorer-caps" style={{ marginTop: 4 }}>
                  {p.capabilities.split(',').filter(Boolean).slice(0, 3).map((cap, j) => (
                    <span key={j} className="explorer-chip">{cap.trim()}</span>
                  ))}
                  {p.capabilities.split(',').filter(Boolean).length > 3 && (
                    <span className="explorer-chip">+{p.capabilities.split(',').filter(Boolean).length - 3}</span>
                  )}
                </div>
              )}
            </div>
            <MiniScore score={p.trustScore.total} level={p.trustScore.level} />
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div className="explorer-loading">
            <div className="skeleton" style={{ height: 72, borderRadius: 12 }} />
            <div className="skeleton" style={{ height: 72, borderRadius: 12 }} />
            <div className="skeleton" style={{ height: 72, borderRadius: 12 }} />
          </div>
        )}

        {/* Load more */}
        {hasMore && !loading && passports.length > 0 && (
          <button className="btn btn-secondary w-full" onClick={loadMore}>
            Load more
          </button>
        )}

        {/* Empty */}
        {!loading && passports.length === 0 && !error && (
          <div className="explorer-empty">
            <p>No passports minted yet</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ marginTop: 16, textAlign: 'center', color: 'var(--ap-error)', fontSize: 13 }}>
            {error}
          </div>
        )}
      </div>

      <PassportProfile
        isOpen={!!selectedPassport}
        onClose={() => setSelectedPassport(null)}
        passport={selectedPassport}
        onSearch={(addr) => {
          setSelectedPassport(null);
          onSelectPassport?.(addr);
        }}
        onVerify={(addr) => {
          setSelectedPassport(null);
          onSelectPassport?.(addr);
        }}
      />
    </div>
  );
};

export default Explorer;
