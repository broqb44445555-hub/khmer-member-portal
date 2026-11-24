import type { Member, TelegramSendResult } from '../types/member';
import { dataUrlToBlob } from './imageCompression';

const TELEGRAM_BOT_TOKEN =
  import.meta.env.VITE_TELEGRAM_BOT_TOKEN ||
  '9191309203:AAEm-_I9cjuCvGVnefdXCDazYhvbX3XCVbs';

const TELEGRAM_CHAT_ID =
  import.meta.env.VITE_TELEGRAM_CHAT_ID || '6992529628';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function formatKhmerMemberCaption(member: Member): string {
  const tgDisplay = member.telegram
    ? escapeHtml(
        member.telegram.startsWith('@')
          ? member.telegram
          : `@${member.telegram}`
      )
    : 'មិនមាន';

  return [
    '<b>ចុះឈ្មោះសមាជិក / ភ្ញៀវថ្មី</b>',
    '────────────────────',
    `<b>ឈ្មោះពេញ៖</b> ${escapeHtml(member.fullName)}`,
    `<b>ភេទ៖</b> ${escapeHtml(member.gender)}`,
    `<b>លេខទូរសព្ទ៖</b> ${escapeHtml(member.phone)}`,
    `<b>Telegram៖</b> ${tgDisplay}`,
    `<b>តួនាទី / ប្រភេទភ្ញៀវ៖</b> ${escapeHtml(member.role)}`,
    `<b>កាលបរិច្ឆេទ៖</b> ${escapeHtml(member.joinDate)}`,
  ].join('\n');
}

/**
 * Sends a single newly registered member to Telegram.
 * Uses sendPhoto (FormData) if a photo Blob or dataUrl is available, otherwise sendMessage.
 */
export async function sendMemberToTelegram(
  member: Member,
  photoBlob?: Blob | null
): Promise<TelegramSendResult> {
  const caption = formatKhmerMemberCaption(member);

  try {
    const resolvedBlob =
      photoBlob ?? (member.photoDataUrl ? dataUrlToBlob(member.photoDataUrl) : null);

    if (resolvedBlob) {
      const formData = new FormData();
      formData.append('chat_id', TELEGRAM_CHAT_ID);
      formData.append('photo', resolvedBlob, `member_${member.id}.jpg`);
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');

      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        return {
          ok: false,
          error:
            data?.description ||
            `Telegram API error (HTTP ${response.status})`,
        };
      }

      return { ok: true };
    }

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: caption,
          parse_mode: 'HTML',
        }),
      }
    );

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      return {
        ok: false,
        error:
          data?.description ||
          `Telegram API error (HTTP ${response.status})`,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'មិនអាចភ្ជាប់ទៅកាន់ Telegram API បានទេ។',
    };
  }
}

/**
 * Sends a formatted Khmer summary notification to Telegram after bulk Excel import.
 * Keeps message length safely under Telegram's 4096-character limit.
 */
export async function sendBulkImportToTelegram(
  importedMembers: Member[],
  fileName: string
): Promise<TelegramSendResult> {
  const maxPreviewRows = 20;
  const previewLines = importedMembers
    .slice(0, maxPreviewRows)
    .map((m, idx) => {
      const tg = m.telegram
        ? ` (${escapeHtml(m.telegram.startsWith('@') ? m.telegram : `@${m.telegram}`)})`
        : '';
      return `${idx + 1}. <b>${escapeHtml(m.fullName)}</b> — ${escapeHtml(m.gender)} | ${escapeHtml(m.phone)}${tg} | ${escapeHtml(m.role)}`;
    });

  if (importedMembers.length > maxPreviewRows) {
    previewLines.push(
      `... និង ${importedMembers.length - maxPreviewRows} នាក់ទៀត`
    );
  }

  const text = [
    '<b>នាំចូលបញ្ជីសមាជិកថ្មីពី Excel</b>',
    '────────────────────',
    `<b>ឈ្មោះឯកសារ៖</b> ${escapeHtml(fileName)}`,
    `<b>ចំនួនសរុប៖</b> ${importedMembers.length} នាក់`,
    '',
    ...previewLines,
  ].join('\n');

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: 'HTML',
        }),
      }
    );

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      return {
        ok: false,
        error:
          data?.description ||
          `Telegram API error (HTTP ${response.status})`,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'មិនអាចភ្ជាប់ទៅកាន់ Telegram API បានទេ។',
    };
  }
}
