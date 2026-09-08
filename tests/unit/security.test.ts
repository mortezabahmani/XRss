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
