/**
 * Universal Asset Path Resolver.
 * Ensures static assets load flawlessly across:
 * 1. GitHub Pages subpaths (e.g. https://<user>.github.io/<repo>/)
 * 2. Root domains (Cloudflare Pages, Vercel, Netlify, Custom Domains)
 * 3. Local development and preview servers (http://localhost:5173/)
 */
export function getAssetPath(relativePath: string): string {
  if (!relativePath) return '';

  // If already an absolute URL or data URI, return as-is
  if (
    relativePath.startsWith('http://') ||
    relativePath.startsWith('https://') ||
    relativePath.startsWith('data:') ||
    relativePath.startsWith('blob:')
  ) {
    return relativePath;
  }

  const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;

  if (typeof window === 'undefined') {
    return `/${cleanPath}`;
  }

  // 1. Honor Vite's base URL if configured (e.g. '/PostMatem/')
  const viteBase = ((import.meta as any).env?.BASE_URL as string) || '';
  if (viteBase && viteBase !== './' && viteBase !== '/') {
    const normalizedPrefix = viteBase.endsWith('/') ? viteBase : `${viteBase}/`;
    return `${normalizedPrefix}${cleanPath}`;
  }

  // 2. Automatic GitHub Pages subpath detection (https://<user>.github.io/<repo>/)
  if (window.location.hostname.endsWith('github.io')) {
    const segments = window.location.pathname.split('/').filter(Boolean);
    if (segments.length > 0 && segments[0] !== cleanPath.split('/')[0]) {
      return `/${segments[0]}/${cleanPath}`;
    }
  }

  return `/${cleanPath}`;
}
