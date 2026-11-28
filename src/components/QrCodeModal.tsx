import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, QrCode, X } from 'lucide-react';

export const REGISTRATION_PORTAL_URL =
  'https://khmer-member-portal-46aw.vercel.app/';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function QrCodeModal({ isOpen, onClose, onNotify }: QrCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    QRCode.toDataURL(REGISTRATION_PORTAL_URL, {
      width: 640,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#082A33',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) {
          onNotify('error', 'មិនអាចបង្កើត QR Code បានទេ។');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, onNotify]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(REGISTRATION_PORTAL_URL);
        copied = true;
      }
    } catch {
      // Fallback below
    }

    if (!copied) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = REGISTRATION_PORTAL_URL;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        copied = false;
      }
    }

    if (copied) {
      setCopiedLink(true);
      onNotify('success', 'បានចម្លងតំណភ្ជាប់គេហទំព័រដោយជោគជ័យ។');
      window.setTimeout(() => setCopiedLink(false), 2000);
    } else {
      onNotify('error', 'មិនអាចចម្លងតំណភ្ជាប់បានទេ។');
    }
  };

  const handleDownloadPoster = async () => {
    if (!qrDataUrl) return;
    setIsDownloading(true);

    try {
      const qrImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load QR image'));
        img.src = qrDataUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = 900;
      canvas.height = 1120;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas unavailable');
      }

      // Clean crisp white card background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Top gradient header banner matching the app
      const headerGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
      headerGrad.addColorStop(0, '#082A33');
      headerGrad.addColorStop(0.5, '#0F4C5C');
      headerGrad.addColorStop(1, '#176478');
      ctx.fillStyle = headerGrad;
      ctx.fillRect(0, 0, canvas.width, 190);

      // Khmer title on banner
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.font = '700 34px "Kantumruy Pro", sans-serif';
      ctx.fillText('ប្រព័ន្ធចុះឈ្មោះសមាជិក និងភ្ញៀវថ្មី', canvas.width / 2, 92);

      ctx.fillStyle = '#CCFBF1';
      ctx.font = '400 22px "Kantumruy Pro", sans-serif';
      ctx.fillText(
        'ស្កេន QR Code ខាងក្រោមដើម្បីចុះឈ្មោះតាមទូរសព្ទ',
        canvas.width / 2,
        142
      );

      // Hairline frame around QR code
      const qrSize = 620;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 250;

      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 3;
      ctx.strokeRect(qrX - 18, qrY - 18, qrSize + 36, qrSize + 36);

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Footer instruction + URL
      ctx.fillStyle = '#0F172A';
      ctx.font = '600 26px "Kantumruy Pro", sans-serif';
      ctx.fillText('QR Code ចុះឈ្មោះ', canvas.width / 2, 955);

      ctx.fillStyle = '#475569';
      ctx.font = '500 20px "IBM Plex Mono", monospace';
      ctx.fillText(REGISTRATION_PORTAL_URL, canvas.width / 2, 1005);

      // Subtle outer border
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = 'qr-code-registration.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onNotify('success', 'បានទាញយករូបភាព QR Code (PNG) ដោយជោគជ័យ។');
    } catch {
      // Fallback: download raw QR code PNG directly
      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = 'qr-code-registration.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onNotify('success', 'បានទាញយករូបភាព QR Code ដោយជោគជ័យ។');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#0F4C5C]">
              <QrCode className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3
                id="qr-modal-title"
                className="text-base font-semibold text-slate-900"
              >
                QR Code ចុះឈ្មោះ
              </h3>
              <p className="text-xs text-slate-500">
                ស្កេនដើម្បីបើកទម្រង់ចុះឈ្មោះសមាជិក និងភ្ញៀវថ្មី
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="បិទ"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scannable QR Code Frame */}
        <div className="mt-5 flex flex-col items-center">
          <div className="flex h-64 w-64 items-center justify-center rounded-xl border border-slate-200 bg-white p-3">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code សម្រាប់ ${REGISTRATION_PORTAL_URL}`}
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
            )}
          </div>

          <p className="mt-3 text-center font-mono text-xs text-slate-500 break-all">
            {REGISTRATION_PORTAL_URL}
          </p>
        </div>

        {/* Actions: Copy Link + Download QR Code */}
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C] whitespace-nowrap"
          >
            {copiedLink ? (
              <Check className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4 text-slate-500" aria-hidden="true" />
            )}
            {copiedLink ? 'បានចម្លងរួចរាល់' : 'ចម្លងតំណភ្ជាប់'}
          </button>

          <button
            type="button"
            onClick={handleDownloadPoster}
            disabled={!qrDataUrl || isDownloading}
            className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0F4C5C] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0B3B49] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C] focus-visible:ring-offset-2 whitespace-nowrap disabled:opacity-55"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            ទាញយក QR Code
          </button>
        </div>
      </div>
    </div>
  );
}
