const GMP_ATTRIBUTION_ID = 'gmp_mcp_codeassist_v1_aistudio';

export interface ParsedMapsLocation {
  /** Safe http/https URL suitable for anchor href */
  safeUrl: string;
  /** Extracted latitude,longitude coordinates if detectable */
  coords?: { lat: number; lng: number };
  /** Embeddable query string for Maps Embed API `place` mode */
  embedQuery?: string;
  /** True when the URL is a shortened link (e.g., maps.app.goo.gl) that cannot be expanded client-side */
  isShortLink: boolean;
}

/**
 * Validates that a user-supplied URL uses strictly http: or https: protocol.
 * Returns normalized URL string or null if invalid/unsafe.
 */
export function sanitizeHttpUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Formats latitude and longitude into the standard shareable Google Maps URL.
 */
export function buildGoogleMapsUrl(lat: number, lng: number): string {
  const fixedLat = Number(lat.toFixed(6));
  const fixedLng = Number(lng.toFixed(6));
  return `https://www.google.com/maps?q=${fixedLat},${fixedLng}`;
}

function parseCoordinatePair(text: string): { lat: number; lng: number } | null {
  const match = text.match(/(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }
  return { lat, lng };
}

/**
 * Extracts coordinates or place query from common Google Maps URL formats
 * so we can render an official Google Maps Embed API v1 preview iframe.
 */
export function parseGoogleMapsUrl(raw?: string | null): ParsedMapsLocation | null {
  const safeUrl = sanitizeHttpUrl(raw);
  if (!safeUrl) return null;

  let urlObj: URL;
  try {
    urlObj = new URL(safeUrl);
  } catch {
    return null;
  }

  const host = urlObj.hostname.toLowerCase();
  const isShortLink =
    host === 'maps.app.goo.gl' ||
    (host === 'goo.gl' && urlObj.pathname.startsWith('/maps'));

  // 1. Check query parameters (?q=, ?query=, ?ll=, ?center=)
  const paramKeys = ['q', 'query', 'll', 'center'];
  for (const key of paramKeys) {
    const val = urlObj.searchParams.get(key)?.trim();
    if (!val) continue;
    const coords = parseCoordinatePair(val);
    if (coords) {
      return {
        safeUrl,
        coords,
        embedQuery: `${coords.lat},${coords.lng}`,
        isShortLink: false,
      };
    }
    if (val.length >= 2) {
      return {
        safeUrl,
        embedQuery: val,
        isShortLink: false,
      };
    }
  }

  // 2. Check Google Maps data pin coordinates (!3dLAT!4dLNG)
  const pinMatch = safeUrl.match(/!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/);
  if (pinMatch) {
    const coords = parseCoordinatePair(`${pinMatch[1]},${pinMatch[2]}`);
    if (coords) {
      return {
        safeUrl,
        coords,
        embedQuery: `${coords.lat},${coords.lng}`,
        isShortLink: false,
      };
    }
  }

  // 3. Check viewport coordinates in path (/@LAT,LNG,ZOOMz)
  const atMatch = urlObj.pathname.match(/@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
  if (atMatch) {
    const coords = parseCoordinatePair(`${atMatch[1]},${atMatch[2]}`);
    if (coords) {
      return {
        safeUrl,
        coords,
        embedQuery: `${coords.lat},${coords.lng}`,
        isShortLink: false,
      };
    }
  }

  // 4. Check /maps/place/<PlaceName>
  const placeMatch = urlObj.pathname.match(/\/maps\/place\/([^/]+)/);
  if (placeMatch?.[1]) {
    const decodedPlace = decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim();
    if (decodedPlace) {
      return {
        safeUrl,
        embedQuery: decodedPlace,
        isShortLink: false,
      };
    }
  }

  return {
    safeUrl,
    isShortLink,
  };
}

/**
 * Builds an official Google Maps Embed API v1 URL (`place` mode) with
 * Khmer language, Cambodia region bias, and mandatory usage attribution ID.
 */
export function buildMapsEmbedIframeUrl(embedQuery: string): string | null {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }

  const params = new URLSearchParams({
    key: apiKey.trim(),
    q: embedQuery,
    zoom: '16',
    language: 'km',
    region: 'KH',
    solution_id: GMP_ATTRIBUTION_ID,
  });

  return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
}
