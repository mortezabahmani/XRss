export function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '0');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  headers.set('Content-Security-Policy', "default-src 'self' 'unsafe-inline'");
  headers.set('Referrer-Policy', 'no-referrer');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function parseCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((pair) => {
    const parts = pair.split('=');
    if (parts.length === 2) {
      cookies[parts[0].trim()] = parts[1].trim();
    }
  });
  return cookies;
}

export function verifyAdminAuth(request: Request, envAdminToken?: string): boolean {
  if (!envAdminToken || typeof envAdminToken !== 'string') {
    return false;
  }

  // 1. Check Authorization: Bearer <token>
  const authHeader = request.headers.get('Authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (safeCompare(token, envAdminToken)) {
      return true;
    }
  }

  // 2. Check HttpOnly cookie (xrss_session)
  const cookies = parseCookies(request);
  const sessionToken = cookies['xrss_session'];
  if (sessionToken && safeCompare(sessionToken, envAdminToken)) {
    return true;
  }

  return false;
}

export function createSessionCookieHeader(token: string): string {
  return `xrss_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`;
}

export function createClearSessionCookieHeader(): string {
  return `xrss_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}
