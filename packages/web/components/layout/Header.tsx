'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Container } from './Container';

const TonConnectButton = dynamic(
  () => import('@tonconnect/ui-react').then((mod) => ({ default: mod.TonConnectButton })),
  { ssr: false, loading: () => <div className="h-10 w-32 rounded-lg animate-shimmer" /> },
);

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/explore', label: 'Explore' },
  { href: '/verify', label: 'Verify' },
  { href: '/my', label: 'My Passports' },
];

export function Header() {
  return (
    <header className="bg-ap-secondary/80 backdrop-blur-lg text-ap-text border-b border-ap-border sticky top-0 z-50">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg hover:opacity-90">
            Agent Passport
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white/90 hover:text-white text-sm font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center">
            <TonConnectButton />
          </div>
        </div>
      </Container>
    </header>
  );
}
