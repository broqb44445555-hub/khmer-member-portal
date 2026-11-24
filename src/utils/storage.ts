import type { Member } from '../types/member';

const STORAGE_KEY = 'khmer_member_registry_v1';

export function getTodayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createMemberId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function loadMembersFromStorage(): Member[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Member[];
  } catch {
    return [];
  }
}

export function saveMembersToStorage(members: Member[]): {
  ok: boolean;
  error?: string;
} {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
    return { ok: true };
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' || err.code === 22)
    ) {
      return {
        ok: false,
        error:
          'ទំហំផ្ទុកក្នុងកម្មវិធីរុករក (localStorage) ពេញហើយ។ សូមនាំចេញ Excel រួចលុបទិន្នន័យចាស់ខ្លះចេញ។',
      };
    }
    return {
      ok: false,
      error: 'មិនអាចរក្សាទុកទិន្នន័យក្នុង localStorage បានទេ។',
    };
  }
}
