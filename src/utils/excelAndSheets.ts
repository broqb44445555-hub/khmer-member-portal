import * as XLSX from 'xlsx';
import {
  BATTAMBANG_DISTRICTS,
  DEFAULT_PROVINCE,
  formatFullKhmerAddress,
} from '../data/battambangAddress';
import type { Gender, Member, MemberAddress } from '../types/member';
import { createMemberId, getTodayLocalDate } from './storage';

const KHMER_HEADERS = [
  'ល.រ',
  'ឈ្មោះពេញ',
  'ភេទ',
  'លេខទូរសព្ទ',
  'Telegram',
  'តួនាទី / ប្រភេទភ្ញៀវ',
  'ទីកន្លែងបច្ចុប្បន្ន',
  'កាលបរិច្ឆេទ',
] as const;

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s/_-]+/g, '').trim();
}

function pickCellValue(
  row: Record<string, unknown>,
  candidateKeys: string[]
): string {
  const entries = Object.entries(row);
  for (const candidate of candidateKeys) {
    const normCandidate = normalizeKey(candidate);
    for (const [rawKey, rawVal] of entries) {
      const normKey = normalizeKey(rawKey);
      if (normKey === normCandidate || normKey.includes(normCandidate)) {
        if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
          return String(rawVal).trim();
        }
      }
    }
  }
  return '';
}

function parseGender(value: string): Gender {
  const lower = value.toLowerCase().trim();
  if (
    lower.includes('ស្រី') ||
    lower === 'f' ||
    lower === 'female' ||
    lower === 'woman'
  ) {
    return 'ស្រី';
  }
  return 'ប្រុស';
}

function parseExcelDate(raw: unknown): string {
  const today = getTodayLocalDate();
  if (raw === undefined || raw === null || raw === '') return today;

  // Handle Excel numeric date serial (e.g., 45678)
  if (typeof raw === 'number' && raw > 20000 && raw < 80000) {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      const y = String(parsed.y).padStart(4, '0');
      const m = String(parsed.m).padStart(2, '0');
      const d = String(parsed.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(raw).trim();
  // Match YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const d = dmy[1].padStart(2, '0');
    const m = dmy[2].padStart(2, '0');
    const y = dmy[3];
    return `${y}-${m}-${d}`;
  }

  const attempt = new Date(str);
  if (!Number.isNaN(attempt.getTime())) {
    const y = attempt.getFullYear();
    const m = String(attempt.getMonth() + 1).padStart(2, '0');
    const d = String(attempt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return today;
}

function normalizeTelegram(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-' || trimmed === '—' || trimmed === 'មិនមាន') {
    return '';
  }
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

/**
 * Parses an uploaded .xlsx / .xls / .csv file using SheetJS into Member records.
 */
export async function importMembersFromExcel(file: File): Promise<Member[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('មិនមានសន្លឹកទិន្នន័យក្នុងឯកសារ Excel នេះទេ។');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
  });

  if (rawRows.length === 0) {
    throw new Error('ឯកសារ Excel មិនមានទិន្នន័យសមាជិកទេ។');
  }

  const nowIso = new Date().toISOString();
  const imported: Member[] = [];

  for (const row of rawRows) {
    const fullName = pickCellValue(row, [
      'ឈ្មោះពេញ',
      'ឈ្មោះ',
      'fullname',
      'name',
      'member',
    ]);
    const phone = pickCellValue(row, [
      'លេខទូរសព្ទ',
      'ទូរសព្ទ',
      'phone',
      'phonenumber',
      'tel',
      'mobile',
    ]);

    // Skip completely empty rows
    if (!fullName && !phone) {
      continue;
    }

    const genderRaw = pickCellValue(row, ['ភេទ', 'gender', 'sex']);
    const telegramRaw = pickCellValue(row, ['telegram', 'តេឡេក្រាម', 'tg']);
    const roleRaw = pickCellValue(row, [
      'តួនាទី / ប្រភេទភ្ញៀវ',
      'តួនាទី',
      'ប្រភេទភ្ញៀវ',
      'ប្រភេទ',
      'role',
      'category',
      'position',
    ]);

    // Find raw date cell (keeping numeric serial if present)
    let rawDateVal: unknown = '';
    for (const [k, v] of Object.entries(row)) {
      const nk = normalizeKey(k);
      if (
        nk.includes('កាលបរិច្ឆេទ') ||
        nk.includes('ថ្ងៃ') ||
        nk.includes('joindate') ||
        nk === 'date'
      ) {
        rawDateVal = v;
        break;
      }
    }

    const addressFullRaw = pickCellValue(row, [
      'ទីកន្លែងបច្ចុប្បន្ន',
      'អាសយដ្ឋាន',
      'address',
      'currentaddress',
    ]);
    const provinceRaw = pickCellValue(row, ['ខេត្ត', 'រាជធានី', 'province']);
    const districtRaw = pickCellValue(row, ['ស្រុក', 'ក្រុង', 'district']);
    const communeRaw = pickCellValue(row, ['ឃុំ', 'សង្កាត់', 'commune']);
    const villageRaw = pickCellValue(row, ['ភូមិ', 'village']);

    let parsedAddress: MemberAddress | undefined;
    if (provinceRaw || districtRaw || communeRaw || villageRaw) {
      const province = provinceRaw || DEFAULT_PROVINCE;
      parsedAddress = {
        province,
        district: districtRaw,
        commune: communeRaw,
        village: villageRaw,
        fullAddress: formatFullKhmerAddress({
          province,
          district: districtRaw,
          commune: communeRaw,
          village: villageRaw,
        }),
      };
    } else if (addressFullRaw) {
      const matchedDistrict =
        BATTAMBANG_DISTRICTS.find((d) => addressFullRaw.includes(d)) || '';
      parsedAddress = {
        province: addressFullRaw.includes(DEFAULT_PROVINCE)
          ? DEFAULT_PROVINCE
          : '',
        district: matchedDistrict,
        commune: '',
        village: '',
        fullAddress: addressFullRaw,
      };
    }

    imported.push({
      id: createMemberId(),
      fullName: fullName || 'មិនមានឈ្មោះ',
      gender: parseGender(genderRaw),
      phone: phone || '—',
      telegram: normalizeTelegram(telegramRaw),
      role: roleRaw || 'សមាជិក',
      joinDate: parseExcelDate(rawDateVal),
      address: parsedAddress,
      createdAt: nowIso,
      telegramSent: false,
    });
  }

  if (imported.length === 0) {
    throw new Error(
      'រកមិនឃើញទិន្នន័យត្រឹមត្រូវទេ។ សូមពិនិត្យក្បាលតារាង (ឈ្មោះពេញ, ភេទ, លេខទូរសព្ទ, តួនាទី)។'
    );
  }

  return imported;
}

/**
 * Exports all member records to an .xlsx file using SheetJS.
 */
export function exportMembersToExcel(members: Member[]): void {
  const rows = members.map((m, index) => ({
    'ល.រ': index + 1,
    'ឈ្មោះពេញ': m.fullName,
    'ភេទ': m.gender,
    'លេខទូរសព្ទ': m.phone,
    Telegram: m.telegram || '',
    'តួនាទី / ប្រភេទភ្ញៀវ': m.role,
    'ទីកន្លែងបច្ចុប្បន្ន': m.address?.fullAddress || '',
    'កាលបរិច្ឆេទ': m.joinDate,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: [...KHMER_HEADERS],
  });

  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 10 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
    { wch: 42 },
    { wch: 15 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'សមាជិក និងភ្ញៀវ');

  const today = getTodayLocalDate();
  XLSX.writeFile(workbook, `members-registry-${today}.xlsx`);
}

function sanitizeTsvCell(value: string): string {
  return value.replace(/[\t\r\n]+/g, ' ').trim();
}

/**
 * Formats all members as TSV (Tab-Separated Values) and copies to clipboard
 * so users can paste directly into Google Sheets.
 */
export async function copyMembersForGoogleSheets(
  members: Member[]
): Promise<boolean> {
  const headerLine = KHMER_HEADERS.join('\t');
  const dataLines = members.map((m, idx) =>
    [
      String(idx + 1),
      sanitizeTsvCell(m.fullName),
      sanitizeTsvCell(m.gender),
      sanitizeTsvCell(m.phone),
      sanitizeTsvCell(m.telegram || ''),
      sanitizeTsvCell(m.role),
      sanitizeTsvCell(m.address?.fullAddress || ''),
      sanitizeTsvCell(m.joinDate),
    ].join('\t')
  );

  const tsvText = [headerLine, ...dataLines].join('\n');

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(tsvText);
      return true;
    }
  } catch {
    // Fall back to execCommand below for restricted iframe contexts
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = tsvText;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Downloads a clean Excel (.xlsx) template with Khmer column headers and one sample row.
 */
export function downloadExcelTemplate(): void {
  const sampleRow = [
    {
      'ល.រ': 1,
      'ឈ្មោះពេញ': 'សុខ ដារ៉ា',
      'ភេទ': 'ប្រុស',
      'លេខទូរសព្ទ': '012 345 678',
      Telegram: '@sokdara',
      'តួនាទី / ប្រភេទភ្ញៀវ': 'សមាជិកថ្មី',
      'ទីកន្លែងបច្ចុប្បន្ន': 'ភូមិ ដីក្រហម, ឃុំកំរៀង, ស្រុកកំរៀង, ខេត្តបាត់ដំបង',
      'កាលបរិច្ឆេទ': getTodayLocalDate(),
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRow, {
    header: [...KHMER_HEADERS],
  });

  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 10 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
    { wch: 42 },
    { wch: 15 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'គំរូសមាជិក');
  XLSX.writeFile(workbook, 'members-template.xlsx');
}

/**
 * Exports full member data (including compressed base64 photos) as a JSON backup file.
 */
export function exportMembersBackupJson(members: Member[]): void {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    count: members.length,
    members,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `members-backup-${getTodayLocalDate()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses and validates a JSON backup file into Member records.
 */
export async function parseMembersBackupJson(file: File): Promise<Member[]> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('ឯកសារ JSON មិនត្រឹមត្រូវ ឬខូចទ្រង់ទ្រាយ។');
  }

  const rawList = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' &&
        parsed !== null &&
        Array.isArray((parsed as { members?: unknown }).members)
      ? (parsed as { members: unknown[] }).members
      : null;

  if (!rawList) {
    throw new Error('រកមិនឃើញបញ្ជីទិន្នន័យសមាជិកក្នុងឯកសារបម្រុងទុកនេះទេ។');
  }

  const nowIso = new Date().toISOString();
  const validMembers: Member[] = [];

  for (const item of rawList) {
    if (typeof item !== 'object' || item === null) continue;
    const obj = item as Record<string, unknown>;
    const fullName = String(obj.fullName ?? '').trim();
    const phone = String(obj.phone ?? '').trim();
    if (!fullName && !phone) continue;

    const rawAddr = obj.address as Record<string, unknown> | undefined;
    const restoredAddress: MemberAddress | undefined =
      rawAddr && typeof rawAddr === 'object'
        ? {
            province: String(rawAddr.province ?? ''),
            district: String(rawAddr.district ?? ''),
            commune: String(rawAddr.commune ?? ''),
            village: String(rawAddr.village ?? ''),
            fullAddress:
              String(rawAddr.fullAddress ?? '').trim() ||
              formatFullKhmerAddress({
                province: String(rawAddr.province ?? ''),
                district: String(rawAddr.district ?? ''),
                commune: String(rawAddr.commune ?? ''),
                village: String(rawAddr.village ?? ''),
              }),
          }
        : undefined;

    validMembers.push({
      id:
        typeof obj.id === 'string' && obj.id.trim()
          ? obj.id.trim()
          : createMemberId(),
      fullName: fullName || 'មិនមានឈ្មោះ',
      gender: parseGender(String(obj.gender ?? 'ប្រុស')),
      phone: phone || '—',
      telegram: normalizeTelegram(String(obj.telegram ?? '')),
      role: String(obj.role ?? 'សមាជិក').trim() || 'សមាជិក',
      joinDate: parseExcelDate(obj.joinDate),
      address: restoredAddress,
      photoDataUrl:
        typeof obj.photoDataUrl === 'string' &&
        obj.photoDataUrl.startsWith('data:image/')
          ? obj.photoDataUrl
          : undefined,
      createdAt:
        typeof obj.createdAt === 'string' && obj.createdAt
          ? obj.createdAt
          : nowIso,
      telegramSent: Boolean(obj.telegramSent),
    });
  }

  if (validMembers.length === 0) {
    throw new Error('មិនមានទិន្នន័យសមាជិកត្រឹមត្រូវក្នុងឯកសារបម្រុងទុកនេះទេ។');
  }

  return validMembers;
}
