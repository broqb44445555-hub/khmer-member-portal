import type { CompressedImageResult } from '../types/member';

const MAX_WIDTH = 600;
const JPEG_QUALITY = 0.7;

/**
 * Compresses and resizes an uploaded image file client-side using HTML5 Canvas.
 * Ensures width <= 600px (preserving aspect ratio) and outputs JPEG at quality 0.7.
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

      img.onload = () => {
        let targetWidth = img.naturalWidth || img.width;
        let targetHeight = img.naturalHeight || img.height;

        if (targetWidth > MAX_WIDTH) {
          const ratio = MAX_WIDTH / targetWidth;
          targetWidth = MAX_WIDTH;
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

        // Fill white background before drawing so transparent PNGs convert cleanly to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              const fallbackBlob = dataUrlToBlob(dataUrl);
              resolve({
                dataUrl,
                blob: fallbackBlob,
                width: targetWidth,
                height: targetHeight,
                sizeKB: Math.max(1, Math.round(fallbackBlob.size / 1024)),
              });
              return;
            }
            resolve({
              dataUrl,
              blob,
              width: targetWidth,
              height: targetHeight,
              sizeKB: Math.max(1, Math.round(blob.size / 1024)),
            });
          },
          'image/jpeg',
          JPEG_QUALITY
        );
      };

      img.src = String(event.target?.result ?? '');
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Converts a base64 data URL (e.g., stored in localStorage) into a Blob for FormData uploads.
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
