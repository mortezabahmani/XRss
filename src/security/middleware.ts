export function addSecurityHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('X-Frame-Options', 'DENY');
  newHeaders.set('X-XSS-Protection', '0');
  newHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  newHeaders.set('Content-Security-Policy', "default-src 'self'");
  newHeaders.set('Referrer-Policy', 'no-referrer');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

export function verifyAdminAuth(request: Request, envAdminToken?: string): boolean {
  if (!envAdminToken) {
    // If no token configured, fail closed for security
    return false;
  }
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.substring(7).trim();
  
  // Timing-safe comparison simulation or direct comparison for string
  if (token.length !== envAdminToken.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ envAdminToken.charCodeAt(i);
  }
  return mismatch === 0;
}
