import { X, Shield, Search, Stamp, CheckCircle, Wallet, Zap, Globe } from 'lucide-react';

interface HelpOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpOverlay = ({ isOpen, onClose }: HelpOverlayProps) => {
  if (!isOpen) return null;

  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-content" onClick={e => e.stopPropagation()}>

        <div className="help-header">
          <h2 className="help-title">Agent Passport</h2>
          <button className="help-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="help-body">
          <div className="help-section">
            <p className="help-description">
              On-chain identity for AI agents on TON blockchain.
              Each passport is a Soulbound Token (SBT) — non-transferable,
              verifiable, and permanent.
            </p>
          </div>

          <div className="help-section">
            <h3 className="help-section-title">How to use</h3>

            <div className="help-step">
              <div className="help-step-icon">
                <Wallet size={18} />
              </div>
              <div>
                <strong>1. Connect Wallet</strong>
                <p>Link your TON wallet via TON Connect on the Home screen</p>
              </div>
            </div>

            <div className="help-step">
              <div className="help-step-icon">
                <Stamp size={18} />
              </div>
              <div>
                <strong>2. Mint Passport</strong>
                <p>Register your AI agent. Quick Mint is free, Self Mint costs 0.05 TON</p>
              </div>
            </div>

            <div className="help-step">
              <div className="help-step-icon">
                <Search size={18} />
              </div>
              <div>
                <strong>3. Search</strong>
                <p>Find any agent passport by TON address</p>
              </div>
            </div>

            <div className="help-step">
              <div className="help-step-icon">
                <CheckCircle size={18} />
              </div>
              <div>
                <strong>4. Verify</strong>
                <p>Check if a passport is authentic and issued by the official registry</p>
              </div>
            </div>
          </div>

          <div className="help-section">
            <h3 className="help-section-title">Mint Modes</h3>

            <div className="help-card">
              <div className="help-card-header">
                <Zap size={16} />
                <strong>Quick Mint</strong>
                <span className="help-badge-free">FREE</span>
              </div>
              <p>Bot mints on your behalf. No wallet signature needed. Instant.</p>
            </div>

            <div className="help-card">
              <div className="help-card-header">
                <Shield size={16} />
                <strong>Self Mint</strong>
                <span className="help-badge-paid">0.05 TON</span>
              </div>
              <p>You sign the transaction directly. Fully decentralized, no intermediary.</p>
            </div>
          </div>

          <div className="help-section">
            <h3 className="help-section-title">Trust Score</h3>
            <p className="help-description" style={{ marginBottom: 8 }}>
              Each passport has a reputation score (0–100) based on:
            </p>
            <div className="help-score-list">
              <div className="help-score-item">
                <span className="help-score-label">Existence</span>
                <span className="help-score-value">20 pts</span>
              </div>
              <div className="help-score-item">
                <span className="help-score-label">Activity (tx count)</span>
                <span className="help-score-value">up to 40 pts</span>
              </div>
              <div className="help-score-item">
                <span className="help-score-label">Age</span>
                <span className="help-score-value">up to 20 pts</span>
              </div>
              <div className="help-score-item">
                <span className="help-score-label">Capabilities</span>
                <span className="help-score-value">up to 20 pts</span>
              </div>
            </div>
          </div>

          <div className="help-section">
            <h3 className="help-section-title">Technology</h3>
            <div className="help-tech-grid">
              <div className="help-tech-item">
                <Globe size={14} />
                <span>TON Blockchain</span>
              </div>
              <div className="help-tech-item">
                <Shield size={14} />
                <span>TEP-85 SBT</span>
              </div>
              <div className="help-tech-item">
                <Zap size={14} />
                <span>Tact Contracts</span>
              </div>
              <div className="help-tech-item">
                <Stamp size={14} />
                <span>TON Connect</span>
              </div>
            </div>
          </div>

          <div className="help-section">
            <h3 className="help-section-title">Links</h3>
            <a
              className="help-link"
              href="https://github.com/ghos3kick/ton-agent-passport"
              target="_blank"
              rel="noopener"
            >
              GitHub Repository &rarr;
            </a>
            <a
              className="help-link"
              href="https://testnet.tonviewer.com/EQDRdykyEDAj9GgM3sPnkj9Y-OM6IG3wX_QmI40emh2HBxZS"
              target="_blank"
              rel="noopener"
            >
              Registry Contract on Tonviewer &rarr;
            </a>
          </div>

          <div className="help-footer">
            <span>Agent Passport v1.0.0 &middot; TON Testnet</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpOverlay;
