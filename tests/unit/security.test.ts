import { describe, it, expect } from 'vitest';
import { verifyAdminAuth, addSecurityHeaders, verifyCsrf, getAuthType, safeCompare } from '../../src/security/middleware';
import { handleConfigApi, handleUpdate, handleAdminLogout } from '../../src/http/handlers';
import { sanitizeHtml } from '../../src/security/sanitizer';
import { Env } from '../../src/config';

describe('Security Middleware', () => {
  describe('safeCompare', () => {
    it('returns true for identical strings', () => {
      expect(safeCompare('secret123', 'secret123')).toBe(true);
      expect(safeCompare('', '')).toBe(true);
      expect(safeCompare('🔒-token-🔑', '🔒-token-🔑')).toBe(true);
    });

    it('returns false for different strings of same length', () => {
      expect(safeCompare('secret123', 'secret124')).toBe(false);
      expect(safeCompare('abc', 'xyz')).toBe(false);
    });

    it('returns false for strings of different lengths', () => {
      expect(safeCompare('secret', 'secret123')).toBe(false);
      expect(safeCompare('secret123', 'secret')).toBe(false);
      expect(safeCompare('', 'a')).toBe(false);
      expect(safeCompare('a', '')).toBe(false);
    });
  });

  it('verifies admin token correctly', () => {
    expect(verifyAdminAuth('Bearer secret123', 'secret123')).toBe(true);
    expect(verifyAdminAuth('Bearer wrong', 'secret123')).toBe(false);
    expect(verifyAdminAuth(null, 'secret123')).toBe(false);
  });

  it('extracts auth type correctly', () => {
    expect(getAuthType(new Request('https://example.com', { headers: { 'Authorization': 'Bearer test' } }))).toBe('bearer');
    expect(getAuthType(new Request('https://example.com', { headers: { 'Cookie': 'xrss_session=test' } }))).toBe('cookie');
    expect(getAuthType(new Request('https://example.com'))).toBe('none');
  });

  it('adds security headers', () => {
    const res = addSecurityHeaders(new Response('OK'));
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
  });

  it('verifies CSRF correctly for safe and unsafe methods', () => {
    const safeReq = new Request('https://example.com/api', { method: 'GET' });
    expect(verifyCsrf(safeReq)).toBe(true);

    const bearerReq = new Request('https://example.com/api', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer token123' }
    });
    expect(verifyCsrf(bearerReq)).toBe(true);

    const validCookieReq = new Request('https://example.com/api', {
      method: 'POST',
      headers: {
        'Cookie': 'xrss_session=token123',
        'Origin': 'https://example.com'
      }
    });
    expect(verifyCsrf(validCookieReq)).toBe(true);

    const invalidCookieReq = new Request('https://example.com/api', {
      method: 'POST',
      headers: {
        'Cookie': 'xrss_session=token123',
        'Origin': 'https://evil.com'
      }
    });
    expect(verifyCsrf(invalidCookieReq)).toBe(false);
  });
});

describe('CSRF Protection Configuration Endpoint Handlers', () => {
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

  it('blocks session cookie POST request when Origin / Referer missing', async () => {
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

describe('HTML Sanitizer URI XSS Prevention', () => {
  it('neutralizes standard javascript:, vbscript:, and unsafe data: URIs', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">Link</a>')).toBe('<a href="">Link</a>');
    expect(sanitizeHtml('<img src="javascript:alert(1)">')).toBe('<img src="">');
    expect(sanitizeHtml('<a action="javascript:alert(1)">Link</a>')).toBe('<a action="">Link</a>');
    expect(sanitizeHtml('<a href="vbscript:msgbox(1)">Link</a>')).toBe('<a href="">Link</a>');
    expect(sanitizeHtml('<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Link</a>')).toBe('<a href="">Link</a>');
  });

  it('neutralizes obfuscated javascript: URIs with HTML entity encoding', () => {
    expect(sanitizeHtml('<a href="java&#x73;cript:alert(1)">Link</a>')).not.toContain('java&#x73;cript:');
    expect(sanitizeHtml('<a href="&#x6A;avascript:alert(1)">Link</a>')).not.toContain('&#x6A;avascript:');
    expect(sanitizeHtml('<a href="javascript&#58;alert(1)">Link</a>')).not.toContain('javascript&#58;');
    expect(sanitizeHtml('<a href="javascript&colon;alert(1)">Link</a>')).not.toContain('javascript&colon;');
    expect(sanitizeHtml('<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)">Link</a>')).not.toContain('alert(1)');
  });

  it('neutralizes javascript: URIs with control characters and whitespace', () => {
    expect(sanitizeHtml('<a href="java\tscript:alert(1)">Link</a>')).not.toContain('alert(1)');
    expect(sanitizeHtml('<a href="java\nscript:alert(1)">Link</a>')).not.toContain('alert(1)');
    expect(sanitizeHtml('<a href="java\r\nscript:alert(1)">Link</a>')).not.toContain('alert(1)');
    expect(sanitizeHtml('<a href="java\0script:alert(1)">Link</a>')).not.toContain('alert(1)');
    expect(sanitizeHtml('<a href=" &#10; j a v a s c r i p t :alert(1)">Link</a>')).not.toContain('alert(1)');
  });

  it('neutralizes unsafe data: URIs like SVG or text/html while allowing safe image data URIs', () => {
    expect(sanitizeHtml('<a href="data:text/html;utf8,<script>alert(1)</script>">Link</a>')).not.toContain('alert(1)');
    expect(sanitizeHtml('<img src="data:image/svg+xml;utf8,<svg onload=alert(1)>">')).not.toContain('onload');

    const safePng = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==">';
    expect(sanitizeHtml(safePng)).toContain('data:image/png;base64,');
  });

  it('preserves valid safe URLs and attributes', () => {
    expect(sanitizeHtml('<a href="https://example.com/page?id=1&name=test">Link</a>')).toBe('<a href="https://example.com/page?id=1&name=test">Link</a>');
    expect(sanitizeHtml('<img src="https://example.com/image.jpg" alt="test">')).toBe('<img src="https://example.com/image.jpg" alt="test">');
    expect(sanitizeHtml('<a href="/relative/path">Relative</a>')).toBe('<a href="/relative/path">Relative</a>');
    expect(sanitizeHtml('<a href="mailto:user@example.com">Email</a>')).toBe('<a href="mailto:user@example.com">Email</a>');
  });
});

describe('Information Exposure Prevention', () => {
  it('does not expose internal error details in handleFeed response', async () => {
    const { handleFeed } = await import('../../src/http/handlers');
    const sensitiveErrorMessage = 'D1_ERROR: connection refused at 10.0.0.12:5432 with password=secret';
    const mockDb = {
      prepare: () => {
        throw new Error(sensitiveErrorMessage);
      }
    } as unknown as D1Database;

    const mockEnv = {
      DB: mockDb
    };

    const req = new Request('https://example.com/');
    const res = await handleFeed(req, mockEnv as any);

    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).toBe('Error generating feed');
    expect(body).not.toContain(sensitiveErrorMessage);
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });
});
