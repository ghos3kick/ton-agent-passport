import { useState, useEffect } from 'react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { ExternalLink } from 'lucide-react';
import { TONSCAN_BASE_URL, NETWORK } from '../utils/contract';
import { shortenAddress } from '../utils/format';
import { validateForm, type FormData as FormState } from '../utils/validation';

type MintStatus = 'idle' | 'pending' | 'success' | 'error';

const CAPABILITIES = ['DeFi', 'NFT', 'Trading', 'Analytics', 'Social', 'Gaming', 'Oracles', 'Bridge'];

export default function MintPassport() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  const walletAddress = wallet?.account?.address ?? '';

  const [owner, setOwner] = useState('');
  const [form, setForm] = useState<FormState>({ name: '', endpoint: '', metadata: '' });
  const [selectedCaps, setSelectedCaps] = useState<string[]>([]);
  const [status, setStatus] = useState<MintStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOwner(walletAddress || '');
  }, [walletAddress]);

  function toggleCap(cap: string) {
    setSelectedCaps(prev =>
      prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap]
    );
    if (errors.capabilities) {
      setErrors(e => { const copy = { ...e }; delete copy.capabilities; return copy; });
    }
  }

  const handleChange = (field: keyof FormState, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setTouched(t => ({ ...t, [field]: true }));
    if (errors[field]) {
      setErrors(e => { const copy = { ...e }; delete copy[field]; return copy; });
    }
  };

  const handleBlur = (field: string) => {
    setTouched(t => ({ ...t, [field]: true }));
    const result = validateForm(form, selectedCaps);
    if (result.errors[field]) {
      setErrors(e => ({ ...e, [field]: result.errors[field] }));
    }
  };

  async function handleSelfMint() {
    const chain = wallet?.account?.chain;
    const expectedChain = NETWORK === 'testnet' ? '-3' : '-239';
    if (chain && chain !== expectedChain) {
      setStatus('error');
      setErrorMsg(`Wrong network: wallet is on ${chain === '-239' ? 'mainnet' : 'testnet'}, but app uses ${NETWORK}. Please switch wallet network.`);
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch {}
      return;
    }

    setStatus('pending');
    setErrorMsg('');

    try {
      const capsString = selectedCaps.join(', ');

      const res = await fetch('/api/public-mint-payload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          owner,
          endpoint: form.endpoint.trim(),
          capabilities: capsString,
          metadata: form.metadata.trim() || 'https://example.com/metadata.json',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatus('error');
        setErrorMsg(data.error || 'Failed to build transaction');
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch {}
        return;
      }

      const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: data.address,
            amount: data.amount,
            payload: data.payload,
          },
        ],
      };

      await tonConnectUI.sendTransaction(tx);

      setStatus('success');
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch {}
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : 'Transaction failed');
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch {}
    }
  }

  async function handleMint() {
    if (!wallet) {
      tonConnectUI.openModal();
      return;
    }

    if (!owner) {
      setErrorMsg('Owner address is required');
      return;
    }

    const result = validateForm(form, selectedCaps);
    if (!result.valid) {
      setErrors(result.errors);
      setTouched({ name: true, endpoint: true, capabilities: true, metadata: true });
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch {}
      return;
    }

    handleSelfMint();
  }

  const inputClass = (field: string) => {
    if (touched[field] && errors[field]) return 'form-input input-error';
    if (touched[field] && !errors[field] && field === 'name' && form.name.length >= 3) return 'form-input input-valid';
    if (touched[field] && !errors[field] && field === 'endpoint' && form.endpoint.trim()) return 'form-input input-valid';
    return 'form-input';
  };

  return (
    <div className="page page-enter">
      <h2 className="page-title">Mint Passport</h2>

      {status === 'success' ? (
        <div className="flex-col gap-16">
          <div className="card mint-success-card text-center" style={{ padding: 32 }}>
            <div className="verify-checkmark">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--ap-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="verify-title success mb-4">
              Passport Minted!
            </div>
            <p className="verify-subtitle">
              Your agent passport has been created on TON blockchain.
            </p>
          </div>
          <a
            href={`${TONSCAN_BASE_URL}/address/${owner}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ textDecoration: 'none', gap: 8 }}
          >
            <ExternalLink size={16} /> View on TONScan
          </a>
          <button
            className="btn-mint"
            onClick={() => {
              setStatus('idle');
              setOwner(walletAddress);
              setForm({ name: '', endpoint: '', metadata: '' });
              setSelectedCaps([]);
              setErrors({});
              setTouched({});
            }}
          >
            Mint Another
          </button>
        </div>
      ) : (
        <div className="flex-col gap-12">
          {/* Owner */}
          <div className="form-group">
            <label className="form-label">Owner</label>
            {wallet ? (
              <div className="form-value mono" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {shortenAddress(owner, 8)}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ap-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            ) : (
              <div
                className="form-value"
                style={{ color: 'var(--ap-accent)', cursor: 'pointer' }}
                onClick={() => tonConnectUI.openModal()}
              >
                Connect wallet
              </div>
            )}
          </div>

          {/* Agent Name */}
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              className={inputClass('name')}
              value={form.name}
              onChange={e => {
                const val = e.target.value.replace(/\b\w/g, c => c.toUpperCase());
                handleChange('name', val);
              }}
              onBlur={() => handleBlur('name')}
              placeholder="e.g. Atlas AI, Trading Bot v2"
              maxLength={50}
            />
            {touched.name && errors.name && (
              <span className="form-error">{errors.name}</span>
            )}
          </div>

          {/* Endpoint */}
          <div className="form-group">
            <label className="form-label">Endpoint</label>
            <input
              className={inputClass('endpoint')}
              placeholder="https://your-agent.com/api (optional)"
              value={form.endpoint}
              onChange={e => handleChange('endpoint', e.target.value)}
              onBlur={() => handleBlur('endpoint')}
              maxLength={256}
            />
            {touched.endpoint && errors.endpoint && (
              <span className="form-error">{errors.endpoint}</span>
            )}
          </div>

          {/* Capabilities */}
          <div className="form-group">
            <label className="form-label">Capabilities</label>
            <div className="cap-chips">
              {CAPABILITIES.map(cap => (
                <span
                  key={cap}
                  className={`cap-chip${selectedCaps.includes(cap) ? ' active' : ''}`}
                  onClick={() => toggleCap(cap)}
                >
                  {cap}
                </span>
              ))}
            </div>
            {touched.capabilities && errors.capabilities && (
              <span className="form-error">{errors.capabilities}</span>
            )}
          </div>

          {/* Cost */}
          <div className="form-hint text-center" style={{ fontSize: 13, opacity: 0.6 }}>
            Cost: ~0.11 TON
          </div>

          {/* Mint Button */}
          <button
            className={`btn-mint${status === 'pending' ? ' loading' : ''}`}
            onClick={handleMint}
            disabled={status === 'pending'}
          >
            {status === 'pending' ? 'Minting...' : 'Mint Passport'}
          </button>

          {status === 'error' && errorMsg && (
            <div className="status error">{errorMsg}</div>
          )}
        </div>
      )}
    </div>
  );
}
