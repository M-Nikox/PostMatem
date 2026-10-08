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

  try {
    // Resolve relative to document.baseURI (which honors <base> tag and subpath routing)
    const base = document.baseURI || window.location.href;
    const normalizedBase = base.endsWith('/') ? base : `${base.split('#')[0].split('?')[0]}/`;
    return new URL(cleanPath, normalizedBase).href;
  } catch {
    const basePrefix = ((import.meta as any).env?.BASE_URL as string) || '/';
    const normalizedPrefix = basePrefix.endsWith('/') ? basePrefix : `${basePrefix}/`;
    return `${normalizedPrefix}${cleanPath}`;
  }
}
