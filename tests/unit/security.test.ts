import { describe, it, expect } from 'vitest';
import { verifyAdminAuth, safeCompare, addSecurityHeaders } from '../../src/security/middleware';

describe('Security Middleware', () => {
  describe('safeCompare', () => {
    it('returns true for identical strings', async () => {
      expect(await safeCompare('secret-123', 'secret-123')).toBe(true);
      expect(await safeCompare('', '')).toBe(true);
      expect(await safeCompare('🔑unicode-token', '🔑unicode-token')).toBe(true);
    });

    it('returns false for mismatched strings of same length', async () => {
      expect(await safeCompare('secret-123', 'secret-124')).toBe(false);
      expect(await safeCompare('a', 'b')).toBe(false);
    });

    it('returns false for strings of different lengths', async () => {
      expect(await safeCompare('secret', 'secret-123')).toBe(false);
      expect(await safeCompare('secret-123', 'secret')).toBe(false);
      expect(await safeCompare('', 'non-empty')).toBe(false);
    });
  });

  it('verifies admin token correctly', async () => {
    const adminToken = 'secret-token-123';
    
    const validReq = new Request('https://example.com/update', {
      headers: { 'Authorization': 'Bearer secret-token-123' }
    });
    expect(await verifyAdminAuth(validReq, adminToken)).toBe(true);

    const validCookieReq = new Request('https://example.com/admin', {
      headers: { 'Cookie': 'xrss_session=secret-token-123' }
    });
    expect(await verifyAdminAuth(validCookieReq, adminToken)).toBe(true);

    const invalidReq = new Request('https://example.com/update', {
      headers: { 'Authorization': 'Bearer wrong-token' }
    });
    expect(await verifyAdminAuth(invalidReq, adminToken)).toBe(false);

    const noAuthReq = new Request('https://example.com/update');
    expect(await verifyAdminAuth(noAuthReq, adminToken)).toBe(false);

    expect(await verifyAdminAuth(validReq, undefined)).toBe(false);
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
