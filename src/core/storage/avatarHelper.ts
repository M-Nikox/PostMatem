/**
 * User Profile Avatar Helper
 * Handles reading, writing, compression, and persistence of user avatars to
 * both localStorage and browser cookies, ensuring compatibility with the game card exporter.
 */

const AVATAR_STORAGE_KEY = 'postmatem_user_avatar';
const AVATAR_COOKIE_NAME = 'postmatem_user_avatar';

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export function setCookie(name: string, value: string, days = 365): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  try {
    const cookieStr = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
    // Only set if within safe single-cookie limit (4KB)
    if (cookieStr.length <= 4000) {
      document.cookie = cookieStr;
    }
  } catch (e) {
    console.warn('[Avatar] Could not set cookie:', e);
  }
}

export function removeCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}

export function getStoredUserAvatar(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const local = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (local) return local;
  } catch (e) {
    console.warn('[Avatar] Could not read localStorage:', e);
  }
  return getCookie(AVATAR_COOKIE_NAME);
}

export function saveStoredUserAvatar(avatar: string | null): void {
  if (typeof window === 'undefined') return;
  if (avatar) {
    try {
      localStorage.setItem(AVATAR_STORAGE_KEY, avatar);
    } catch (e) {
      console.warn('[Avatar] Could not save to localStorage:', e);
    }
    setCookie(AVATAR_COOKIE_NAME, avatar);
  } else {
    try {
      localStorage.removeItem(AVATAR_STORAGE_KEY);
    } catch (e) {
      console.warn('[Avatar] Could not remove from localStorage:', e);
    }
    removeCookie(AVATAR_COOKIE_NAME);
  }
}

/**
 * Resizes, center-crops to a 1:1 square, and compresses an image file to an optimized
 * WebP / PNG data URL suitable for localStorage, cookies, and game card export.
 */
export function processAvatarFile(file: File, targetSize = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) return reject(new Error('Empty image file.'));

      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image.'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(src);
          }

          // Center-crop to 1:1 aspect ratio
          const minDim = Math.min(img.naturalWidth, img.naturalHeight);
          const sx = (img.naturalWidth - minDim) / 2;
          const sy = (img.naturalHeight - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

          // Attempt WebP compression first (smaller size for cookies/localStorage)
          try {
            const webp = canvas.toDataURL('image/webp', 0.85);
            if (webp.startsWith('data:image/webp')) {
              return resolve(webp);
            }
          } catch {
            // WebP not supported, fall through to PNG
          }

          resolve(canvas.toDataURL('image/png'));
        } catch (err) {
          reject(err);
        }
      };
      img.src = src;
    };

    reader.readAsDataURL(file);
  });
}
