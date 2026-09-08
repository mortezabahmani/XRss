import { describe, it, expect } from 'vitest';
import { verifyAdminAuth, addSecurityHeaders } from '../../src/security/middleware';
import { sanitizeHtml } from '../../src/security/sanitizer';

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

describe('HTML Sanitizer - URI XSS Prevention', () => {
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
    expect(sanitizeHtml('<a href=" &#10; j a v a s c r i p t : alert(1)">Link</a>')).not.toContain('alert(1)');
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
