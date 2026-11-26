import { parseFullKhmerAddress } from '../data/battambangAddress';
import type { Gender, Member } from '../types/member';
import { getTodayLocalDate } from './storage';

export const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxuHgCnvEu5keiAkW45_1oJZL2LQF3oh8o1ff-UN4hSNlgPoZhRqYOjPsAIcLyQIAr3Iw/exec';

export interface DbMutationResult {
  ok: boolean;
  error?: string;
}

function normalizeGender(val: unknown): Gender {
  const str = String(val ?? '').trim().toLowerCase();
  if (str.includes('ស្រី') || str === 'f' || str === 'female') {
    return 'ស្រី';
  }
  return 'ប្រុស';
}

function normalizeJoinDate(val: unknown): string {
  if (val === undefined || val === null || val === '') {
    return getTodayLocalDate();
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  // Handle ISO strings returned by Google Sheets date cells
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return str;
}

function normalizeTelegram(val: unknown): string {
  const str = String(val ?? '').trim();
  if (!str || str === '-' || str === '—' || str === 'មិនមាន') return '';
  return str.startsWith('@') ? str : `@${str}`;
}

function normalizePhoto(val: unknown): string | undefined {
  const str = String(val ?? '').trim();
  if (!str) return undefined;
  if (str.startsWith('data:image/') || str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }
  return undefined;
}

function mapRawRowToMember(raw: Record<string, unknown>, index: number): Member | null {
  const fullName = String(
    raw.fullName ?? raw.name ?? raw['ឈ្មោះពេញ'] ?? ''
  ).trim();
  const phone = String(
    raw.phone ?? raw.phoneNumber ?? raw['លេខទូរសព្ទ'] ?? ''
  ).trim();

  if (!fullName && !phone) {
    return null;
  }

  const rawId = raw.id ?? raw.ID ?? raw._id;
  const id =
    rawId !== undefined && rawId !== null && String(rawId).trim() !== ''
      ? String(rawId).trim()
      : `row_${index}_${Date.now()}`;

  const rawAddress = raw.address ?? raw['ទីកន្លែងបច្ចុប្បន្ន'] ?? '';
  const address =
    typeof rawAddress === 'string'
      ? parseFullKhmerAddress(rawAddress)
      : typeof rawAddress === 'object' && rawAddress !== null
        ? parseFullKhmerAddress(
            String((rawAddress as { fullAddress?: unknown }).fullAddress ?? '')
          )
        : undefined;

  const joinDate = normalizeJoinDate(
    raw.joinDate ?? raw.date ?? raw['កាលបរិច្ឆេទ']
  );

  return {
    id,
    fullName: fullName || 'មិនមានឈ្មោះ',
    gender: normalizeGender(raw.gender ?? raw['ភេទ']),
    phone: phone || '—',
    telegram: normalizeTelegram(raw.telegram ?? raw.Telegram),
    role:
      String(
        raw.role ?? raw.category ?? raw['តួនាទី / ប្រភេទភ្ញៀវ'] ?? ''
      ).trim() || 'សមាជិក',
    joinDate,
    address,
    photoDataUrl: normalizePhoto(raw.photo ?? raw.photoDataUrl),
    createdAt:
      typeof raw.createdAt === 'string' && raw.createdAt
        ? raw.createdAt
        : `${joinDate}T00:00:00.000Z`,
    telegramSent: true,
  };
}

function extractRowsArray(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null
    );
  }
  if (typeof payload === 'object' && payload !== null) {
    const obj = payload as Record<string, unknown>;
    const candidates = [obj.data, obj.members, obj.rows, obj.records, obj.items, obj.result];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.filter(
          (item): item is Record<string, unknown> =>
            typeof item === 'object' && item !== null
        );
      }
    }
  }
  return [];
}

/**
 * Fetches all member records directly from the Google Apps Script Web App URL (no cache).
 */
export async function fetchMembersFromDb(): Promise<Member[]> {
  const url = `${APPS_SCRIPT_URL}?t=${Date.now()}`;
  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`មិនអាចទាញទិន្នន័យពី Google Sheets បានទេ (HTTP ${response.status})`);
  }

  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('ទិន្នន័យដែលទទួលបានពី Google Apps Script មិនមែនជា JSON ត្រឹមត្រូវទេ។');
  }

  const rawRows = extractRowsArray(parsed);
  const members: Member[] = [];

  rawRows.forEach((row, idx) => {
    const mapped = mapRawRowToMember(row, idx);
    if (mapped) {
      members.push(mapped);
    }
  });

  return members;
}

async function postToAppsScript(
  payload: Record<string, unknown>
): Promise<DbMutationResult> {
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Google Sheets API error (HTTP ${response.status})`,
      };
    }

    const text = await response.text();
    if (text.trim()) {
      try {
        const json = JSON.parse(text) as {
          ok?: boolean;
          success?: boolean;
          status?: string;
          error?: string;
          message?: string;
        };
        if (
          json.ok === false ||
          json.success === false ||
          json.status === 'error'
        ) {
          return {
            ok: false,
            error: json.error || json.message || 'Google Apps Script returned an error',
          };
        }
      } catch {
        // Non-JSON 200 OK response from Apps Script still indicates completion
      }
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'មិនអាចភ្ជាប់ទៅកាន់ Google Apps Script បានទេ។',
    };
  }
}

export function createMemberInDb(member: Member): Promise<DbMutationResult> {
  return postToAppsScript({
    action: 'create',
    id: String(member.id),
    fullName: member.fullName,
    gender: member.gender,
    phone: member.phone,
    telegram: member.telegram || '',
    role: member.role,
    address: member.address?.fullAddress || '',
    joinDate: member.joinDate,
    photo: member.photoDataUrl || '',
  });
}

export function updateMemberInDb(member: Member): Promise<DbMutationResult> {
  return postToAppsScript({
    action: 'update',
    id: String(member.id),
    fullName: member.fullName,
    gender: member.gender,
    phone: member.phone,
    telegram: member.telegram || '',
    role: member.role,
    address: member.address?.fullAddress || '',
    joinDate: member.joinDate,
    photo: member.photoDataUrl || '',
  });
}

export function deleteMemberInDb(id: string): Promise<DbMutationResult> {
  return postToAppsScript({
    action: 'delete',
    id: String(id),
  });
}
