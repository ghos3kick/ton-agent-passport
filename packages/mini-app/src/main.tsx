import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/telegram.css';

function showError(title: string, message: string) {
  const root = document.getElementById('root')!;
  root.textContent = '';
  const pre = document.createElement('pre');
  pre.style.cssText = 'color:#ef4444;padding:16px;font-size:12px;word-break:break-all;white-space:pre-wrap;';
  pre.textContent = `${title}: ${message}`;
  root.appendChild(pre);
}

window.addEventListener('error', (e) => {
  // Ignore cross-origin "Script error" — Telegram WebView fires these on input focus
  if (!e.message || e.message.toLowerCase() === 'script error' || e.message.toLowerCase() === 'script error.') return;
  showError('ERROR', e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason?.message || '';
  if (!msg || msg.toLowerCase() === 'script error' || msg.toLowerCase() === 'script error.') return;
  showError('ERROR', msg || 'Something went wrong');
});

// Prevent overscroll/pull-to-refresh in Telegram WebView
let startY = 0;
document.addEventListener('touchstart', (e) => {
  startY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) return;
  // Don't block scroll when an input/textarea is focused (keyboard open)
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

  // Find the nearest scrollable ancestor of the touch target
  let el = e.target as HTMLElement | null;
  let scrollable: HTMLElement | null = null;
  while (el && el !== document.documentElement) {
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
      scrollable = el;
      break;
    }
    el = el.parentElement;
  }

  // If touch is inside a scrollable container (e.g. help overlay), let it scroll freely
  const root = document.getElementById('root');
  if (scrollable && scrollable !== root) return;

  if (!root) return;
  const currentY = e.touches[0].clientY;
  const isScrollingDown = currentY > startY;
  // Block pull-to-refresh: when at top and swiping down
  if (isScrollingDown && root.scrollTop <= 0) {
    e.preventDefault();
    return;
  }
  // Block overscroll at bottom
  if (!isScrollingDown && root.scrollTop + root.clientHeight >= root.scrollHeight) {
    e.preventDefault();
    return;
  }
}, { passive: false });

// Telegram WebApp initialization
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.expand();
  window.Telegram.WebApp.isClosingConfirmationEnabled = true;
  // disableVerticalSwipes available since Bot API 7.7
  if ('disableVerticalSwipes' in window.Telegram.WebApp) {
    (window.Telegram.WebApp as any).disableVerticalSwipes();
  }
}

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} catch (e: unknown) {
  const err = e instanceof Error ? e : new Error(String(e));
  showError('INIT ERROR', err.message);
}
