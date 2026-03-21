interface TelegramWebApp {
  ready(): void;
  expand(): void;
  close(): void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show(): void;
    hide(): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
    enable(): void;
    disable(): void;
    showProgress(leaveActive?: boolean): void;
    hideProgress(): void;
    setText(text: string): void;
    setParams(params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }): void;
  };
  BackButton: {
    isVisible: boolean;
    show(): void;
    hide(): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
  };
  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
  themeParams: Record<string, string>;
  colorScheme: 'light' | 'dark';
  initData: string;
  initDataUnsafe: Record<string, unknown>;
  isClosingConfirmationEnabled: boolean;
  disableVerticalSwipes(): void;
  enableVerticalSwipes(): void;
  platform: string;
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}
