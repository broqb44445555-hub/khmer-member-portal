export type Gender = 'ប្រុស' | 'ស្រី';

export interface Member {
  id: string;
  fullName: string;
  gender: Gender;
  phone: string;
  telegram: string;
  role: string;
  joinDate: string; // YYYY-MM-DD
  photoDataUrl?: string; // Compressed base64 JPEG (max width 600px, quality 0.7)
  createdAt: string; // ISO timestamp
  telegramSent?: boolean;
}

export interface CompressedImageResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  sizeKB: number;
}

export interface TelegramSendResult {
  ok: boolean;
  error?: string;
}

export interface SuccessModalPayload {
  title: string;
  subtitle: string;
  member?: Member;
  importedCount?: number;
  telegramSent: boolean;
  telegramError?: string;
}

export interface ToastNotice {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
