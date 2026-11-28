import type { Member, TelegramSendResult } from '../types/member';
import { sanitizeHttpUrl } from './googleMaps';
import { dataUrlToBlob } from './imageCompression';

const TELEGRAM_BOT_TOKEN =
  import.meta.env.VITE_TELEGRAM_BOT_TOKEN ||
  '9191309203:AAEm-_I9cjuCvGVnefdXCDazYhvbX3XCVbs';

const TELEGRAM_CHAT_IDS: string[] = (
  import.meta.env.VITE_TELEGRAM_CHAT_IDS || '6992529628,8468559961'
)
  .split(',')
  .map((id: string) => id.trim())
  .filter(Boolean);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatKhmerMemberCaption(
  member: Member,
  headerTitle = 'ចុះឈ្មោះសមាជិក / ភ្ញៀវថ្មី'
): string {
  const tgDisplay = member.telegram
    ? escapeHtml(
        member.telegram.startsWith('@')
          ? member.telegram
          : `@${member.telegram}`
      )
    : 'មិនមាន';

  const addressDisplay = member.address?.fullAddress
    ? escapeHtml(member.address.fullAddress)
    : 'មិនបានបញ្ជាក់';

  const safeMapsUrl = sanitizeHttpUrl(member.mapsLink);

  const lines = [
    `<b>${escapeHtml(headerTitle)}</b>`,
    '────────────────────',
    `<b>ឈ្មោះពេញ៖</b> ${escapeHtml(member.fullName)}`,
    `<b>ភេទ៖</b> ${escapeHtml(member.gender)}`,
    `<b>លេខទូរសព្ទ៖</b> ${escapeHtml(member.phone)}`,
    `<b>Telegram៖</b> ${tgDisplay}`,
    `<b>តួនាទី / ប្រភេទភ្ញៀវ៖</b> ${escapeHtml(member.role)}`,
    `<b>ទីកន្លែងបច្ចុប្បន្ន៖</b> ${addressDisplay}`,
  ];

  if (safeMapsUrl) {
    lines.push(
      `<b>ទីតាំង Google Maps៖</b> <a href="${escapeHtml(safeMapsUrl)}">📍 បើកមើលលើ Google Maps</a>`
    );
  }

  lines.push(`<b>កាលបរិច្ឆេទ៖</b> ${escapeHtml(member.joinDate)}`);

  return lines.join('\n');
}

async function sendSingleChatMember(
  chatId: string,
  member: Member,
  caption: string,
  resolvedBlob: Blob | null
): Promise<TelegramSendResult> {
  try {
    if (resolvedBlob) {
      const formData = new FormData();
      formData.append('chat_id', chatId);
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
          chat_id: chatId,
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

async function sendSingleChatText(
  chatId: string,
  text: string
): Promise<TelegramSendResult> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
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

/**
 * Sends a newly registered member to all configured Telegram recipients (both Chat IDs).
 * Uses sendPhoto (FormData) if a photo Blob or dataUrl is available, otherwise sendMessage.
 */
export async function sendMemberToTelegram(
  member: Member,
  photoBlob?: Blob | null,
  headerTitle?: string
): Promise<TelegramSendResult> {
  const caption = formatKhmerMemberCaption(member, headerTitle);
  const resolvedBlob =
    photoBlob ?? (member.photoDataUrl ? dataUrlToBlob(member.photoDataUrl) : null);

  const results = await Promise.all(
    TELEGRAM_CHAT_IDS.map((chatId) =>
      sendSingleChatMember(chatId, member, caption, resolvedBlob)
    )
  );

  const failed = results
    .map((res, idx) => ({ res, chatId: TELEGRAM_CHAT_IDS[idx] }))
    .filter(({ res }) => !res.ok);

  if (failed.length === 0) {
    return { ok: true };
  }

  const succeededCount = results.length - failed.length;
  const errorDetails = failed
    .map(({ chatId, res }) => `Chat ${chatId}: ${res.error || 'Error'}`)
    .join(' | ');

  if (succeededCount > 0) {
    return {
      ok: true,
      error: `ផ្ញើបាន ${succeededCount}/${results.length} គណនី (${errorDetails})`,
    };
  }

  return {
    ok: false,
    error: errorDetails,
  };
}

/**
 * Sends a formatted Khmer summary notification to all configured Telegram recipients after bulk Excel import.
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

  const results = await Promise.all(
    TELEGRAM_CHAT_IDS.map((chatId) => sendSingleChatText(chatId, text))
  );

  const failed = results
    .map((res, idx) => ({ res, chatId: TELEGRAM_CHAT_IDS[idx] }))
    .filter(({ res }) => !res.ok);

  if (failed.length === 0) {
    return { ok: true };
  }

  const succeededCount = results.length - failed.length;
  const errorDetails = failed
    .map(({ chatId, res }) => `Chat ${chatId}: ${res.error || 'Error'}`)
    .join(' | ');

  if (succeededCount > 0) {
    return {
      ok: true,
      error: `ផ្ញើបាន ${succeededCount}/${results.length} គណនី (${errorDetails})`,
    };
  }

  return {
    ok: false,
    error: errorDetails,
  };
}
