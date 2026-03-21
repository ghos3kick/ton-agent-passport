import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import RobotAvatar from './RobotAvatar';
import { formatDate } from '../utils/format';
import { TONSCAN_BASE_URL } from '../utils/contract';
import type { ExplorerPassport } from '../hooks/useExplorer';

const levelColors: Record<string, string> = {
  elite: '#10b981', verified: '#3b82f6', trusted: '#8b5cf6',
  new: '#f59e0b', none: '#475569', revoked: '#ef4444',
};

interface Props {
  passport: ExplorerPassport;
  onClick?: () => void;
}

const HolographicPassportCard = ({ passport, onClick }: Props) => {
  const [copied, setCopied] = useState(false);

  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const copyAddress = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(passport.owner);
      setCopied(true);
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const agentName = passport.name || `Agent #${passport.index}`;
  const score = passport.trustScore.total;
  const level = passport.trustScore.level;
  const color = levelColors[level] || levelColors.none;
  const caps = passport.capabilities.split(',').filter(Boolean);
  const endpoint = passport.endpoint && passport.endpoint !== 'https://example.com' ? passport.endpoint : null;

  const ringR = 28;
  const ringC = 2 * Math.PI * ringR;

  return (
    <div
      className="profile-holo-card passport-card-enter"
      onClick={onClick}
      style={onClick ? { cursor: 'pointer', transition: 'transform 0.2s' } : undefined}
    >
      <div className="profile-holo-card-inner" style={{ padding: '20px 16px' }}>

        {/* Identity: avatar + name/address + trust ring */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1, marginBottom: 14 }}>
          <RobotAvatar address={passport.owner} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="profile-name" style={{ fontSize: 18, marginBottom: 2 }}>{agentName}</h2>
            <button className="profile-address" style={{ padding: '2px 0' }} onClick={copyAddress}>
              <span>{shortAddr(passport.owner)}</span>
              {copied ? <Check size={12} color="var(--ap-success)" /> : <Copy size={12} />}
            </button>
          </div>
          {/* Compact trust ring */}
          <div className="holo-trust-ring">
            <svg width={64} height={64} viewBox="0 0 64 64">
              <circle cx="32" cy="32" r={ringR} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
              <circle
                cx="32" cy="32" r={ringR} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
                strokeDasharray={ringC} strokeDashoffset={ringC * (1 - score / 100)}
                transform="rotate(-90 32 32)"
                style={{ transition: 'stroke-dashoffset 1.2s ease-out', filter: `drop-shadow(0 0 4px ${color}40)` }}
              />
            </svg>
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color }}>{score}</span>
          </div>
        </div>

        {/* Status + Level */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1, marginBottom: 12 }}>
          {passport.isActive ? (
            <span className="badge-verified">Active</span>
          ) : (
            <span className="badge-revoked" style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600 }}>Revoked</span>
          )}
          <div className="trust-level-badge" style={{
            background: `${color}15`, border: `1px solid ${color}30`, color,
            padding: '3px 10px', fontSize: 10,
          }}>
            {level.toUpperCase()}
          </div>
        </div>

        {/* Capabilities */}
        {caps.length > 0 && (
          <div className="passport-caps" style={{ position: 'relative', zIndex: 1, marginBottom: 12 }}>
            {caps.map((cap, i) => (
              <span key={i} className="capability-chip">{cap.trim()}</span>
            ))}
          </div>
        )}

        <div className="passport-divider" />

        {/* Compact details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', position: 'relative', zIndex: 1, marginTop: 12, marginBottom: endpoint ? 12 : 0 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--ap-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>TX Count</div>
            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{passport.txCount}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--ap-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Index</div>
            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>#{passport.index}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--ap-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Created</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{passport.createdAt > 0 ? formatDate(passport.createdAt) : '\u2014'}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--ap-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Network</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Testnet</div>
          </div>
        </div>

        {/* Endpoint */}
        {endpoint && (
          <a
            href={endpoint} target="_blank" rel="noopener"
            onClick={e => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ap-accent)', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", wordBreak: 'break-all', textDecoration: 'none', position: 'relative', zIndex: 1, marginBottom: 4 }}
          >
            {endpoint} <ExternalLink size={11} />
          </a>
        )}

        <div className="passport-divider" />

        {/* TONScan link */}
        <a
          href={`${TONSCAN_BASE_URL}/address/${passport.owner}`}
          target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', color: 'var(--ap-text-secondary)', fontSize: 12, textDecoration: 'none', position: 'relative', zIndex: 1 }}
        >
          <ExternalLink size={13} /> View on TONScan
        </a>
      </div>
    </div>
  );
};

export default HolographicPassportCard;
