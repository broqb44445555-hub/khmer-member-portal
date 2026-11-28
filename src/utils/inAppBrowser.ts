export interface InAppBrowserInfo {
  isInAppBrowser: boolean;
  isAndroid: boolean;
  isIos: boolean;
  appName: 'Messenger / Facebook' | 'Telegram' | null;
  chromeRedirectUrl: string;
}

const DEFAULT_PUBLIC_HOST = 'khmer-member-portal-46aw.vercel.app';

export function buildChromeRedirectUrl(isAndroid: boolean, isIos: boolean): string {
  const host =
    typeof window !== 'undefined' && window.location.host
      ? window.location.host
      : DEFAULT_PUBLIC_HOST;
  const pathname =
    typeof window !== 'undefined' && window.location.pathname && window.location.pathname !== '/'
      ? window.location.pathname
      : '';
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const target = `${host}${pathname}${search}`;

  if (isAndroid) {
    return `intent://${target}#Intent;scheme=https;package=com.android.chrome;end`;
  }
  if (isIos) {
    return `googlechrome://${target}`;
  }
  return `https://${target}`;
}

export function detectInAppBrowser(): InAppBrowserInfo {
  if (typeof navigator === 'undefined') {
    return {
      isInAppBrowser: false,
      isAndroid: false,
      isIos: false,
      appName: null,
      chromeRedirectUrl: `https://${DEFAULT_PUBLIC_HOST}`,
    };
  }

  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isFacebookOrMessenger = /FBAN|FBAV|Messenger/i.test(ua);
  const isTelegram = /Telegram/i.test(ua);
  const isInAppBrowser = isFacebookOrMessenger || isTelegram;

  const appName = isTelegram
    ? 'Telegram'
    : isFacebookOrMessenger
      ? 'Messenger / Facebook'
      : null;

  return {
    isInAppBrowser,
    isAndroid,
    isIos,
    appName,
    chromeRedirectUrl: buildChromeRedirectUrl(isAndroid, isIos),
  };
}
