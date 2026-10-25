export function createCspNonce(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(18))));
}

export const ERROR_DOCUMENT_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "Content-Security-Policy":
    "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "private, no-store",
};

export function documentSecurityHeaders(
  nonce: string,
  apiUrl: string,
  development = false,
): Record<string, string> {
  if (!/^[A-Za-z0-9+/]{24}$/.test(nonce)) throw new Error("Invalid CSP nonce");
  const api = new URL(apiUrl);
  if (!["https:", "http:"].includes(api.protocol)) throw new Error("Invalid API origin");
  const scripts = development
    ? "'self' 'unsafe-inline'"
    : `'nonce-${nonce}' 'strict-dynamic' 'self'`;
  return {
    "Content-Security-Policy": [
      "default-src 'self'",
      `script-src ${scripts}`,
      "script-src-attr 'none'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'self' https://lovable.dev https://*.lovable.dev https://*.lovable.app",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: http:",
      "media-src 'self' blob: https: http:",
      `connect-src 'self' ${api.origin}${development ? " ws: wss:" : ""}`,
      "worker-src 'self' blob:",
    ].join("; "),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // Per-request nonces must not be reused by a shared HTML cache.
    "Cache-Control": "private, no-store",
  };
}
