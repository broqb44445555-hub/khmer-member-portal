import type { CompressedImageResult } from '../types/member';

const SHEET_THUMB_MAX_WIDTH = 150;
const SHEET_THUMB_QUALITY = 0.5;

const TELEGRAM_MAX_WIDTH = 600;
const TELEGRAM_QUALITY = 0.7;

function renderCanvas(
  img: HTMLImageElement,
  maxWidth: number,
  quality: number
): Promise<{ dataUrl: string; blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    let targetWidth = img.naturalWidth || img.width;
    let targetHeight = img.naturalHeight || img.height;

    if (targetWidth > maxWidth) {
      const ratio = maxWidth / targetWidth;
      targetWidth = maxWidth;
      targetHeight = Math.max(1, Math.round(targetHeight * ratio));
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('កម្មវិធីរុករកមិនគាំទ្រការបង្ហាប់រូបភាពទេ។'));
      return;
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const dataUrl = canvas.toDataURL('image/jpeg', quality);

    canvas.toBlob(
      (blob) => {
        const resolvedBlob = blob ?? dataUrlToBlob(dataUrl);
        resolve({
          dataUrl,
          blob: resolvedBlob,
          width: targetWidth,
          height: targetHeight,
        });
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Compresses an uploaded image file client-side:
 * - Small base64 JPEG thumbnail (max width 150px, quality 0.5) for saving cleanly into Google Sheets.
 * - Crisp JPEG Blob (max width 600px, quality 0.7) for sending directly to Telegram via sendPhoto.
 */
export function compressImageFile(file: File): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('សូមជ្រើសរើសឯកសាររូបភាពតែប៉ុណ្ណោះ។'));
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('មិនអាចអានឯកសាររូបភាពបានទេ។'));
    };

    reader.onload = (event) => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error('រូបភាពមិនត្រឹមត្រូវ ឬមិនអាចបើកបានទេ។'));
      };

      img.onload = async () => {
        try {
          const [sheetThumb, telegramPhoto] = await Promise.all([
            renderCanvas(img, SHEET_THUMB_MAX_WIDTH, SHEET_THUMB_QUALITY),
            renderCanvas(img, TELEGRAM_MAX_WIDTH, TELEGRAM_QUALITY),
          ]);

          resolve({
            dataUrl: sheetThumb.dataUrl,
            blob: telegramPhoto.blob,
            width: sheetThumb.width,
            height: sheetThumb.height,
            sizeKB: Math.max(1, Math.round(sheetThumb.blob.size / 1024)),
          });
        } catch (err) {
          reject(err);
        }
      };

      img.src = String(event.target?.result ?? '');
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Converts a base64 data URL into a Blob for FormData uploads.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0]?.match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binaryString = atob(parts[1] ?? '');
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}
