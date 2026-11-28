import { useState } from 'react';
import {
  AlertCircle,
  ExternalLink,
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

const IN_APP_BROWSER_GEO_ERROR =
  "មិនអាចចាប់ទីតាំងបានទេ! ប្រសិនបើអ្នកកំពុងបើកតាម Messenger ឬ Telegram សូមចុចលើសញ្ញា (•••) ខាងលើ រួចជ្រើសរើស 'Open in Chrome / Browser' ដើម្បីយកទីតាំង ឬអាច Copy Link ពីកម្មវិធី Google Maps មកបិទភ្ជាប់ដោយផ្ទាល់បាន។";

export function MapsLocationField({
  value,
  onChange,
  idPrefix = 'maps',
  disabled = false,
}: MapsLocationFieldProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [locatingStage, setLocatingStage] = useState<'gps' | 'network'>('gps');
  const [geoError, setGeoError] = useState<string | null>(null);

  const parsedLocation = parseGoogleMapsUrl(value);
  const embedSrc = parsedLocation?.embedQuery
    ? buildMapsEmbedIframeUrl(parsedLocation.embedQuery)
    : null;

  const handleCaptureGps = () => {
    setGeoError(null);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError(IN_APP_BROWSER_GEO_ERROR);
      return;
    }

    const onSuccess = (position: GeolocationPosition) => {
      const url = buildGoogleMapsUrl(
        position.coords.latitude,
        position.coords.longitude
      );
      onChange(url);
      setIsLocating(false);
    };

    const requestNetworkFallback = () => {
      setLocatingStage('network');
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        () => {
          setIsLocating(false);
          setGeoError(IN_APP_BROWSER_GEO_ERROR);
        },
        {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 60000,
        }
      );
    };

    setIsLocating(true);
    setLocatingStage('gps');

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setIsLocating(false);
          setGeoError(IN_APP_BROWSER_GEO_ERROR);
          return;
        }
        // Automatically fall back to Wi-Fi / 4G network location on Timeout or Position Unavailable
        requestNetworkFallback();
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  };

  return (
    <div className="space-y-2.5 pt-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          htmlFor={`${idPrefix}-google-maps-link`}
          className="block text-xs font-medium text-slate-700"
        >
          តំណភ្ជាប់ Google Maps (Google Maps Link){' '}
          <span className="font-normal text-slate-400">(មិនចាំបាច់)</span>
        </label>

        <button
          type="button"
          onClick={handleCaptureGps}
          disabled={disabled || isLocating}
          className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#0F4C5C]/30 bg-[#0F4C5C]/[0.05] px-3 py-1.5 text-xs font-semibold text-[#0F4C5C] transition-colors hover:bg-[#0F4C5C]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C] whitespace-nowrap shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLocating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              {locatingStage === 'network'
                ? 'កំពុងចាប់ទីតាំងតាម Wi-Fi/4G...'
                : 'កំពុងចាប់ទីតាំង GPS...'}
            </>
          ) : (
            <>
              <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
              📍 យកទីតាំងបច្ចុប្បន្ន (GPS)
            </>
          )}
        </button>
      </div>

      <div className="relative">
        <input
          id={`${idPrefix}-google-maps-link`}
          type="url"
          value={value}
          onChange={(e) => {
            setGeoError(null);
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
              setGeoError(null);
              onChange('');
            }}
            aria-label="សម្អាតតំណភ្ជាប់ Google Maps"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {geoError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
        >
          <AlertCircle
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700"
            aria-hidden="true"
          />
          <span>{geoError}</span>
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
