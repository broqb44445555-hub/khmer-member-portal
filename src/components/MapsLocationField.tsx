import { useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  MapPin,
  Navigation,
  X,
} from 'lucide-react';
import {
  buildGoogleMapsUrl,
  buildMapsEmbedIframeUrl,
  parseGoogleMapsUrl,
} from '../utils/googleMaps';

interface MapsLocationFieldProps {
  value: string;
  onChange: (nextUrl: string) => void;
  idPrefix?: string;
  disabled?: boolean;
}

const IP_FALLBACK_SUCCESS_MSG =
  '✅ បានចាប់ទីតាំងតាមបណ្តាញអ៊ីនធឺណិតរួចរាល់! (បើចង់បានទីតាំងច្បាស់ 100% សូមបើកក្នុង Chrome)';

const OFFLINE_HELPER_MSG =
  'សូមចុចប៊ូតុង «🗺️ បើក Google Maps» ខាងលើ ដើម្បីរើសទីតាំង រួចចុច Share → Copy Link មកបិទភ្ជាប់ក្នុងប្រអប់នេះ។';

async function fetchWithTimeout(url: string, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
    });
  } finally {
    window.clearTimeout(timer);
  }
}

function isValidCoordPair(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

async function fetchIpGeolocation(): Promise<{ lat: number; lng: number } | null> {
  const providers: Array<{
    url: string;
    parse: (data: Record<string, unknown>) => { lat: number; lng: number } | null;
  }> = [
    {
      url: 'https://ipwho.is/',
      parse: (data) => {
        if (data.success === false) return null;
        const lat = Number(data.latitude);
        const lng = Number(data.longitude);
        return isValidCoordPair(lat, lng) ? { lat, lng } : null;
      },
    },
    {
      url: 'https://ipapi.co/json/',
      parse: (data) => {
        const lat = Number(data.latitude);
        const lng = Number(data.longitude);
        return isValidCoordPair(lat, lng) ? { lat, lng } : null;
      },
    },
    {
      url: 'https://get.geojs.io/v1/ip/geo.json',
      parse: (data) => {
        const lat = Number(data.latitude);
        const lng = Number(data.longitude);
        return isValidCoordPair(lat, lng) ? { lat, lng } : null;
      },
    },
  ];

  for (const provider of providers) {
    try {
      const response = await fetchWithTimeout(provider.url, 6000);
      if (!response.ok) continue;
      const json = (await response.json()) as Record<string, unknown>;
      const coords = provider.parse(json);
      if (coords) {
        return coords;
      }
    } catch {
      // Try next free IP geolocation provider
    }
  }

  return null;
}

export function MapsLocationField({
  value,
  onChange,
  idPrefix = 'maps',
  disabled = false,
}: MapsLocationFieldProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [locatingStage, setLocatingStage] = useState<'gps' | 'ip'>('gps');
  const [statusNotice, setStatusNotice] = useState<{
    type: 'success' | 'info';
    message: string;
  } | null>(null);

  const parsedLocation = parseGoogleMapsUrl(value);
  const embedSrc = parsedLocation?.embedQuery
    ? buildMapsEmbedIframeUrl(parsedLocation.embedQuery)
    : null;

  const runIpFallback = async () => {
    setLocatingStage('ip');
    const coords = await fetchIpGeolocation();
    setIsLocating(false);

    if (coords) {
      const url = buildGoogleMapsUrl(coords.lat, coords.lng);
      onChange(url);
      setStatusNotice({
        type: 'success',
        message: IP_FALLBACK_SUCCESS_MSG,
      });
    } else {
      setStatusNotice({
        type: 'info',
        message: OFFLINE_HELPER_MSG,
      });
    }
  };

  const handleCaptureGps = () => {
    setStatusNotice(null);
    setIsLocating(true);
    setLocatingStage('gps');

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      void runIpFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const url = buildGoogleMapsUrl(
          position.coords.latitude,
          position.coords.longitude
        );
        onChange(url);
        setIsLocating(false);
        setStatusNotice(null);
      },
      () => {
        // Step 2: Automatic Smart Fallback via Free IP Geolocation (no yellow error)
        void runIpFallback();
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  };

  return (
    <div className="space-y-2.5 pt-1">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label
          htmlFor={`${idPrefix}-google-maps-link`}
          className="block text-xs font-medium text-slate-700"
        >
          តំណភ្ជាប់ Google Maps (Google Maps Link){' '}
          <span className="font-normal text-slate-400">(មិនចាំបាច់)</span>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCaptureGps}
            disabled={disabled || isLocating}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#0F4C5C]/30 bg-[#0F4C5C]/[0.05] px-3 py-1.5 text-xs font-semibold text-[#0F4C5C] transition-colors hover:bg-[#0F4C5C]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C] whitespace-nowrap shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLocating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                {locatingStage === 'ip'
                  ? 'កំពុងចាប់ទីតាំងតាមបណ្តាញ...'
                  : 'កំពុងចាប់ទីតាំង GPS...'}
              </>
            ) : (
              <>
                <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                📍 យកទីតាំងបច្ចុប្បន្ន (GPS)
              </>
            )}
          </button>

          <a
            href="https://maps.google.com"
            target="_blank"
            rel="noopener noreferrer"
            title="បើក Google Maps រើសទីតាំង រួចចុច Share → Copy Link មក Paste"
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-[#0F4C5C]/40 hover:bg-slate-50 hover:text-[#0F4C5C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C] whitespace-nowrap shrink-0"
          >
            🗺️ បើក Google Maps
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="relative">
        <input
          id={`${idPrefix}-google-maps-link`}
          type="url"
          value={value}
          onChange={(e) => {
            setStatusNotice(null);
            onChange(e.target.value);
          }}
          disabled={disabled}
          placeholder="https://www.google.com/maps?q=13.0957,103.2022 ឬ Copy & Paste តំណភ្ជាប់..."
          className="block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-9 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#0F4C5C] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 disabled:bg-slate-50"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={() => {
              setStatusNotice(null);
              onChange('');
            }}
            aria-label="សម្អាតតំណភ្ជាប់ Google Maps"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {statusNotice && (
        <div
          role="status"
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed ${
            statusNotice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 font-medium text-emerald-800'
              : 'border-blue-200 bg-blue-50 text-blue-900'
          }`}
        >
          {statusNotice.type === 'success' ? (
            <CheckCircle2
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
              aria-hidden="true"
            />
          ) : (
            <Info
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600"
              aria-hidden="true"
            />
          )}
          <span>{statusNotice.message}</span>
        </div>
      )}

      {/* Live Google Maps Embed Preview */}
      {parsedLocation && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {embedSrc ? (
            <iframe
              title="មើលទីតាំងលើ Google Maps ជាមុន"
              src={embedSrc}
              width="100%"
              height="220"
              loading="lazy"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="block h-[220px] min-h-[200px] w-full border-0"
            />
          ) : (
            <div className="flex items-center gap-2.5 px-3.5 py-3 text-xs text-slate-600">
              <MapPin
                className="h-4 w-4 shrink-0 text-[#0F4C5C]"
                aria-hidden="true"
              />
              <span className="flex-1 leading-relaxed">
                {parsedLocation.isShortLink
                  ? 'បានទទួលតំណភ្ជាប់ Google Maps កាត់ខ្លី។ ចុចប៊ូតុងខាងក្រោមដើម្បីផ្ទៀងផ្ទាត់ទីតាំងលើ Google Maps ដោយផ្ទាល់។'
                  : 'បានភ្ជាប់តំណភ្ជាប់ទីតាំង Google Maps រួចរាល់។'}
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2 text-xs">
            <span className="font-mono text-[11px] tabular-nums text-slate-500">
              {parsedLocation.coords
                ? `GPS: ${parsedLocation.coords.lat.toFixed(6)}, ${parsedLocation.coords.lng.toFixed(6)}`
                : 'តំណភ្ជាប់ Google Maps ត្រឹមត្រូវ'}
            </span>
            <a
              href={parsedLocation.safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-[#0F4C5C] hover:underline whitespace-nowrap"
            >
              បើកមើលលើ Google Maps
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
