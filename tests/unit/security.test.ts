import { describe, it, expect } from 'vitest';
import { verifyAdminAuth, addSecurityHeaders, verifyCsrf, getAuthType } from '../../src/security/middleware';
import { handleConfigApi, handleUpdate, handleAdminLogout } from '../../src/http/handlers';
import { Env } from '../../src/config';

describe('Security Middleware', () => {
  it('verifies admin token correctly', () => {
    const adminToken = 'secret-token-123';
    
    const validReq = new Request('https://example.com/update', {
      headers: { 'Authorization': 'Bearer secret-token-123' }
    });
    expect(verifyAdminAuth(validReq, adminToken)).toBe(true);

    const invalidReq = new Request('https://example.com/update', {
      headers: { 'Authorization': 'Bearer wrong-token' }
    });
    expect(verifyAdminAuth(invalidReq, adminToken)).toBe(false);

    const noAuthReq = new Request('https://example.com/update');
    expect(verifyAdminAuth(noAuthReq, adminToken)).toBe(false);
  });

  it('identifies auth type correctly', () => {
    const adminToken = 'secret-token-123';

    const bearerReq = new Request('https://example.com/api/config', {
      headers: { 'Authorization': 'Bearer secret-token-123' }
    });
    expect(getAuthType(bearerReq, adminToken)).toBe('bearer');

    const cookieReq = new Request('https://example.com/api/config', {
      headers: { 'Cookie': 'xrss_session=secret-token-123' }
    });
    expect(getAuthType(cookieReq, adminToken)).toBe('session');

    const noAuthReq = new Request('https://example.com/api/config');
    expect(getAuthType(noAuthReq, adminToken)).toBeNull();
  });

  it('validates CSRF origin and referer headers', () => {
    const validOriginReq = new Request('https://example.com/api/config', {
      headers: { 'Origin': 'https://example.com' }
    });
    expect(verifyCsrf(validOriginReq)).toBe(true);

    const validRefererReq = new Request('https://example.com/api/config', {
      headers: { 'Referer': 'https://example.com/admin' }
    });
    expect(verifyCsrf(validRefererReq)).toBe(true);

    const invalidOriginReq = new Request('https://example.com/api/config', {
      headers: { 'Origin': 'https://attacker.com' }
    });
    expect(verifyCsrf(invalidOriginReq)).toBe(false);

    const crossSiteReq = new Request('https://example.com/api/config', {
      headers: { 'Origin': 'https://example.com', 'Sec-Fetch-Site': 'cross-site' }
    });
    expect(verifyCsrf(crossSiteReq)).toBe(false);

    const missingHeadersReq = new Request('https://example.com/api/config');
    expect(verifyCsrf(missingHeadersReq)).toBe(false);
  });

  it('adds security headers to response', async () => {
    const res = new Response('OK');
    const secured = addSecurityHeaders(res);

    expect(secured.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(secured.headers.get('X-Frame-Options')).toBe('DENY');
    expect(secured.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
    expect(secured.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
  });
});

describe('CSRF Protection on Configuration Endpoint & Handlers', () => {
  const env: Env = {
    ADMIN_TOKEN: 'secret-token-123'
  };

  it('blocks session cookie POST request when CSRF check fails', async () => {
    const req = new Request('https://example.com/api/config', {
      method: 'POST',
      headers: {
        'Cookie': 'xrss_session=secret-token-123',
        'Content-Type': 'application/json',
        'Origin': 'https://evil.com'
      },
      body: JSON.stringify({ xUsername: 'hacked' })
    });

    const res = await handleConfigApi(req, env);
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe('CSRF check failed');
  });

  it('blocks session cookie POST request when Origin and Referer are missing', async () => {
    const req = new Request('https://example.com/api/config', {
      method: 'POST',
      headers: {
        'Cookie': 'xrss_session=secret-token-123',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ xUsername: 'hacked' })
    });

    const res = await handleConfigApi(req, env);
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe('CSRF check failed');
  });

  it('allows session cookie POST request when Origin is same-origin', async () => {
    const req = new Request('https://example.com/api/config', {
      method: 'POST',
      headers: {
        'Cookie': 'xrss_session=secret-token-123',
        'Content-Type': 'application/json',
        'Origin': 'https://example.com'
      },
      body: JSON.stringify({ xUsername: 'validuser' })
    });

    const res = await handleConfigApi(req, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success?: boolean };
    expect(body.success).toBe(true);
  });

  it('allows Bearer token POST request without CSRF Origin header', async () => {
    const req = new Request('https://example.com/api/config', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer secret-token-123',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ xUsername: 'validuser' })
    });

    const res = await handleConfigApi(req, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success?: boolean };
    expect(body.success).toBe(true);
  });

  it('blocks CSRF on /update endpoint with session cookie', async () => {
    const req = new Request('https://example.com/update', {
      method: 'POST',
      headers: {
        'Cookie': 'xrss_session=secret-token-123',
        'Origin': 'https://evil.com'
      }
    });

    const res = await handleUpdate(req, env);
    expect(res.status).toBe(403);
  });

  it('blocks CSRF on /admin/logout endpoint with session cookie', async () => {
    const req = new Request('https://example.com/admin/logout', {
      method: 'POST',
      headers: {
        'Cookie': 'xrss_session=secret-token-123',
        'Origin': 'https://evil.com'
      }
    });

    const res = await handleAdminLogout(req, env);
    expect(res.status).toBe(403);
  });
});
