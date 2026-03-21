/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';

// Mock Telegram WebApp
Object.defineProperty(window, 'Telegram', {
  value: {
    WebApp: {
      ready: () => {},
      expand: () => {},
      close: () => {},
      themeParams: {
        bg_color: '#0a0e1a',
        text_color: '#f1f5f9',
        hint_color: '#94a3b8',
        button_color: '#3b82f6',
        button_text_color: '#ffffff',
        secondary_bg_color: '#111827',
      },
      colorScheme: 'dark',
      initData: '',
      initDataUnsafe: {},
      HapticFeedback: {
        impactOccurred: () => {},
        notificationOccurred: () => {},
        selectionChanged: () => {},
      },
      MainButton: { show: () => {}, hide: () => {}, setText: () => {} },
      BackButton: { show: () => {}, hide: () => {} },
    },
  },
});

// Mock clipboard
Object.assign(navigator, {
  clipboard: { writeText: async () => {} },
});

// Mock fetch
global.fetch = vi.fn();
