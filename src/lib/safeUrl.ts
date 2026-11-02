const ALLOWED_DOMAINS = ['github.com', 'vercel.app', 'vercel.com', 'railway.app', 'railway.com'];

/**
 * Returns the URL string only if it is http(s) and its host is an allowed
 * provider domain (or a subdomain of one). Otherwise returns null.
 */
export function safeUrl(u: unknown): string | null {
  if (typeof u !== 'string' || u.length === 0) return null;

  let parsed: URL;
  try {
    parsed = new URL(u);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  if (parsed.username || parsed.password) return null;

  const host = parsed.hostname.toLowerCase();
  const ok = ALLOWED_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
  return ok ? parsed.href : null;
}
