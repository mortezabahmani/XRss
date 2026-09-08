import { describe, it, expect } from 'vitest';
import { verifyAdminAuth, addSecurityHeaders } from '../../src/security/middleware';

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

  it('adds security headers to response', async () => {
    const res = new Response('OK');
    const secured = addSecurityHeaders(res);

    expect(secured.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(secured.headers.get('X-Frame-Options')).toBe('DENY');
    expect(secured.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
    expect(secured.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
  });
});
