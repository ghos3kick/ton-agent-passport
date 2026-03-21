import { useState, useEffect, Component, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, ShieldCheck } from 'lucide-react';

class HomeErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) {
      return (
        <div className="page" style={{ textAlign: 'center', paddingTop: 60 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Agent Passport</h2>
          <p style={{ color: 'var(--ap-text-secondary)', marginTop: 8 }}>Something went wrong. Try reloading.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function HomeContent() {
  const navigate = useNavigate();
  const cached = localStorage.getItem('ap_total_passports');
  const [stats, setStats] = useState({ totalPassports: cached ? Number(cached) : 0, loading: !cached });

  useEffect(() => {
    const update = (n: number) => {
      localStorage.setItem('ap_total_passports', String(n));
      setStats({ totalPassports: n, loading: false });
    };
    fetch('/api/passports?limit=0')
      .then(r => r.json())
      .then(data => update(data.total ?? 0))
      .catch(() => setStats(s => ({ ...s, loading: false })));
  }, []);

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingBottom: 90 }}>
      <div style={{ textAlign: 'center', paddingTop: 64 }}>
        <h1 className="page-title" style={{ fontSize: 28 }}>Agent Passport</h1>
        <p className="page-subtitle" style={{ marginBottom: 0 }}>On-chain identity for AI agents on TON</p>
      </div>

      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <button onClick={() => navigate('/explorer')} className="home-agents-btn">
          {stats.loading
            ? <span className="skeleton" style={{ display: 'inline-block', width: 18, height: 16, borderRadius: 4 }} />
            : <span style={{ fontWeight: 700, color: 'var(--ap-text-primary)', fontSize: 15 }}>{stats.totalPassports}</span>
          }
          <span>agents registered</span>
          <span style={{ color: 'var(--ap-accent)' }}>&rarr;</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 40 }}>
        <button
          className="btn-mint"
          onClick={() => navigate('/mint')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
        >
          <PlusCircle size={20} />
          Register New Passport
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/verify')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
        >
          <ShieldCheck size={20} />
          Verify Passport
        </button>
      </div>

      <div style={{ flex: 1 }} />

      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--ap-text-muted)', letterSpacing: '0.05em' }}>
        Powered by TON Blockchain
      </p>
    </div>
  );
}

export default function Home() {
  return (
    <HomeErrorBoundary>
      <HomeContent />
    </HomeErrorBoundary>
  );
}
