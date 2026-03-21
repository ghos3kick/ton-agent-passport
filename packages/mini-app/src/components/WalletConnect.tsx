import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useState, useEffect } from 'react';
import { Wallet, LogOut } from 'lucide-react';
import { shortenAddress } from '../utils/format';
import { getPassportsByOwner } from '../hooks/useTonApi';
import type { PassportData } from '../hooks/useTonApi';
import PassportCard from './PassportCard';

export default function WalletConnect() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [passports, setPassports] = useState<PassportData[]>([]);
  const [loading, setLoading] = useState(false);

  const walletAddress = wallet?.account?.address;
  const displayAddress = walletAddress ? shortenAddress(walletAddress, 6) : '';

  useEffect(() => {
    if (!walletAddress) {
      setPassports([]);
      return;
    }
    setLoading(true);
    getPassportsByOwner(walletAddress)
      .then(setPassports)
      .catch(() => setPassports([]))
      .finally(() => setLoading(false));
  }, [walletAddress]);

  return (
    <div className="page page-enter">
      {!wallet ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'var(--ap-gradient-holo-subtle)',
            border: '1px solid var(--ap-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Wallet size={28} color="var(--ap-text-secondary)" />
          </div>
          <h2 className="page-title" style={{ marginBottom: 8 }}>My Wallet</h2>
          <p style={{ color: 'var(--ap-text-secondary)', fontSize: 13, marginBottom: 24 }}>
            Connect your TON wallet to view your passports
          </p>
          <button className="btn-mint" onClick={() => tonConnectUI.openModal()}>
            Connect Wallet
          </button>
        </div>
      ) : (
        <>
          <h2 className="page-title">My Wallet</h2>
          <p className="page-subtitle">Connected passports</p>

          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ap-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>
                Connected
              </div>
              <div className="wallet-address">{displayAddress}</div>
            </div>
            <button
              className="btn btn-danger"
              style={{ width: 'auto', padding: '8px 14px', fontSize: 13, gap: 6 }}
              onClick={() => tonConnectUI.disconnect()}
            >
              <LogOut size={14} /> Disconnect
            </button>
          </div>

          <div className="section-title" style={{ marginBottom: 12 }}>My Passports</div>

          {loading ? (
            <div className="loading-center">
              <div className="spinner" />
            </div>
          ) : passports.length > 0 ? (
            passports.map((p) => <PassportCard key={p.address} passport={p} />)
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Wallet size={32} strokeWidth={1.5} />
              </div>
              <p className="empty-state-title">No Passports</p>
              <p className="empty-state-text">No passports found for this wallet</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
