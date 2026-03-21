'use client';

export function ExplorerHeader() {
  return (
    <header className="border-b border-ap-divider bg-ap-secondary/60 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex h-14 items-center justify-between">
        <a href="/" className="flex items-center gap-2 font-semibold text-ap-text hover:opacity-90 transition-opacity">
          <span
            className="font-mono font-semibold text-sm px-1.5 py-0.5 rounded-md border border-ap-accent/30"
            style={{ background: 'linear-gradient(135deg, #00d4aa, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >
            AP
          </span>
          <span className="hidden sm:inline text-sm">Agent Passport</span>
        </a>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-ap-accent bg-ap-accent/10 px-2 py-0.5 rounded-full">
            testnet
          </span>
          <a
            href="https://t.me/agent_passport_ton_bot/app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-ap-accent/10 text-ap-accent px-3 py-1 rounded-md hover:bg-ap-accent/20 transition-colors"
          >
            Mini App
          </a>
        </div>
      </div>
    </header>
  );
}
