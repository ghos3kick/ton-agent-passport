import { useState } from 'react';
import { BarChart3, Calendar, CheckCircle, XCircle, Link as LinkIcon, Copy, Check } from 'lucide-react';
import type { PassportData } from '../hooks/useTonApi';
import { shortenAddress, formatDate } from '../utils/format';
import { TONSCAN_BASE_URL, NETWORK } from '../utils/contract';
import { calculateTrustScoreLocal } from '../utils/reputation';
import RobotAvatar from './RobotAvatar';

interface Props {
  passport: PassportData;
  animate?: boolean;
}

export default function PassportCard({ passport, animate = false }: Props) {
  const [copied, setCopied] = useState(false);
  const trustScore = calculateTrustScoreLocal(passport);

  const capabilities = passport.capabilities
    ? passport.capabilities.split(',').map(c => c.trim()).filter(Boolean)
    : [];

  function handleCopy() {
    navigator.clipboard.writeText(passport.ownerAddress).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={`passport-card${animate ? ' passport-card-enter' : ''}`}>
      <div className="passport-card-inner">
        {/* Header */}
        <div className="passport-header">
          <span className="passport-label">Agent Passport</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="passport-trust-mini">
              <span className="trust-dot" style={{ background: trustScore.color }} />
              <span>{trustScore.total}/100</span>
            </div>
            <span className="passport-index">#{String(passport.index).padStart(4, '0')}</span>
          </div>
        </div>

        {/* Identity */}
        <div className="passport-identity">
          <RobotAvatar address={passport.ownerAddress} size={48} />
          <div>
            <div className="passport-name">Agent #{passport.index}</div>
            <div className="passport-address">
              <a
                href={`${TONSCAN_BASE_URL}/address/${passport.ownerAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="address-text"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                {shortenAddress(passport.ownerAddress, 6)}
              </a>
              <button className="copy-btn" onClick={handleCopy} type="button">
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          </div>
        </div>

        {/* Capabilities */}
        {capabilities.length > 0 && (
          <div className="passport-section">
            <div className="passport-section-label">Capabilities</div>
            <div className="passport-caps">
              {capabilities.map(cap => (
                <span key={cap} className="capability-chip">{cap}</span>
              ))}
            </div>
          </div>
        )}

        {/* Endpoint */}
        {passport.endpoint && passport.endpoint !== 'https://example.com' && (
          <div className="passport-section">
            <div className="passport-section-label">Endpoint</div>
            <div className="passport-endpoint">{passport.endpoint}</div>
          </div>
        )}

        <div className="passport-divider" />

        {/* Footer stats */}
        <div className="passport-footer">
          <div className="passport-footer-item">
            <BarChart3 size={14} />
            <span>TX: {passport.txCount}</span>
          </div>
          <div className="passport-footer-item">
            <Calendar size={14} />
            <span>{formatDate(passport.createdAt)}</span>
          </div>
          <div className="passport-footer-item">
            {passport.isActive
              ? <><CheckCircle size={14} color="var(--ap-success)" /><span style={{ color: 'var(--ap-success)' }}>Verified</span></>
              : <><XCircle size={14} color="var(--ap-error)" /><span style={{ color: 'var(--ap-error)' }}>Revoked</span></>
            }
          </div>
          <div className="passport-footer-item">
            <LinkIcon size={14} />
            <span>TON {NETWORK === 'mainnet' ? 'Mainnet' : 'Testnet'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
