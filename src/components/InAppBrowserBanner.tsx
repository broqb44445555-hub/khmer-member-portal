import { useEffect, useMemo } from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { detectInAppBrowser } from '../utils/inAppBrowser';

let hasAttemptedAutoRedirect = false;

export function InAppBrowserBanner() {
  const info = useMemo(() => detectInAppBrowser(), []);

  useEffect(() => {
    if (!info.isInAppBrowser || !info.isAndroid || hasAttemptedAutoRedirect) {
      return;
    }
    hasAttemptedAutoRedirect = true;

    const timer = window.setTimeout(() => {
      try {
        window.location.href = info.chromeRedirectUrl;
      } catch {
        // Fallback: keep the blue banner visible so the user can tap manually
      }
    }, 150);

    return () => window.clearTimeout(timer);
  }, [info]);

  if (!info.isInAppBrowser) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="ជូនដំណឹងអំពីការបើកក្នុង Chrome"
      className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5 text-blue-950"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <Globe
            className="mt-0.5 h-4 w-4 shrink-0 text-blue-600"
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed font-medium text-blue-900">
            អ្នកកំពុងបើកតាម Messenger/Telegram។ ដើម្បីឱ្យប៊ូតុង GPS ដំណើរការ 100%
            សូមចុចប៊ូតុងខាងក្រោមដើម្បីបើកក្នុង Chrome
          </p>
        </div>

        <a
          href={info.chromeRedirectUrl}
          className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 whitespace-nowrap shrink-0"
        >
          🌐 បើកក្នុង Chrome ឥឡូវនេះ
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
