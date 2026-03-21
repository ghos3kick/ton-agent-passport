import { useEffect, useState, useRef } from 'react';
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { TonConnectUIProvider, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Info, Wallet, LogOut } from 'lucide-react';
import Home from './components/Home';
import WalletConnect from './components/WalletConnect';
import MintPassport from './components/MintPassport';
import VerifyPassport from './components/VerifyPassport';
import Explorer from './components/Explorer';
import Navigation from './components/Navigation';
import HelpOverlay from './components/HelpOverlay';
import { TONCONNECT_MANIFEST_URL } from './utils/contract';
import { shortenAddress } from './utils/format';

function TelegramBackButton() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const tgApp = window.Telegram?.WebApp;
    if (!tgApp) return;

    const isRoot = location.pathname === '/';

    if (isRoot) {
      tgApp.BackButton.hide();
    } else {
      tgApp.BackButton.show();
      const handler = () => navigate('/');
      tgApp.BackButton.onClick(handler);
      return () => tgApp.BackButton.offClick(handler);
    }
  }, [location, navigate]);

  return null;
}

function ExplorerPage() {
  const navigate = useNavigate();
  return (
    <Explorer
      onBack={() => navigate('/')}
      onSelectPassport={(addr) => navigate('/verify', { state: { address: addr } })}
    />
  );
}

function WalletButton() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close dropdown on disconnect
  useEffect(() => {
    if (!wallet) setOpen(false);
  }, [wallet]);

  const handleClick = () => {
    if (!wallet) {
      tonConnectUI.openModal();
    } else {
      setOpen(v => !v);
    }
  };

  return (
    <div ref={ref} className="wallet-toggle-wrap">
      <button
        className={`wallet-toggle${wallet ? ' connected' : ''}`}
        onClick={handleClick}
        aria-label="Wallet"
      >
        <Wallet size={18} />
      </button>
      {open && wallet && (
        <div className="wallet-dropdown">
          <div className="wallet-dropdown-addr">
            {shortenAddress(wallet.account.address, 6)}
          </div>
          <button
            className="wallet-dropdown-disconnect"
            onClick={() => {
              tonConnectUI.disconnect();
              setOpen(false);
            }}
          >
            <LogOut size={14} />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

function AppContent() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <div className="home-bg" />
      <TelegramBackButton />

      <div className="top-buttons">
        <WalletButton />
        <button
          className="help-toggle"
          onClick={() => setShowHelp(true)}
          aria-label="Help"
        >
          <Info size={20} />
        </button>
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/wallet" element={<WalletConnect />} />
        <Route path="/verify" element={<VerifyPassport />} />
        <Route path="/explorer" element={<ExplorerPage />} />
        <Route path="/mint" element={<MintPassport />} />
      </Routes>
      <Navigation />

      <HelpOverlay isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
}

export default function App() {
  useEffect(() => {
    const tgApp = window.Telegram?.WebApp;
    if (tgApp) {
      tgApp.ready();
      tgApp.expand();
      if ('disableVerticalSwipes' in tgApp) {
        (tgApp as any).disableVerticalSwipes();
      }
    }
  }, []);

  return (
    <TonConnectUIProvider
      manifestUrl={TONCONNECT_MANIFEST_URL}
      actionsConfiguration={{
        twaReturnUrl: 'https://t.me/agent_passport_ton_bot/app',
      }}
    >
      <MemoryRouter initialEntries={['/']}>
        <AppContent />
      </MemoryRouter>
    </TonConnectUIProvider>
  );
}
