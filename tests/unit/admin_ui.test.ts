import { describe, it, expect } from 'vitest';
import { renderAdminLoginView, renderAdminDashboardView } from '../../src/ui/admin';

describe('Admin UI Views', () => {
  it('renders admin login view', () => {
    const html = renderAdminLoginView();
    expect(html).toContain('<title>XRSS Control Center // Login</title>');
    expect(html).toContain('<form onsubmit="handleLogin(event)">');
  });

  it('renders admin dashboard view with secure DOM manipulation for posts', () => {
    const html = renderAdminDashboardView();
    expect(html).toContain('<title>XRSS Control Center</title>');

    // Check that innerHTML template assignment for mapped posts is removed
    expect(html).not.toContain('tbody.innerHTML = posts.map');

    // Check that safe DOM manipulation functions exist
    expect(html).toContain('document.createElement(\'tr\')');
    expect(html).toContain('textContent');
    expect(html).toContain('sanitizeUrl');
  });

  it('safely handles XSS vectors in URL sanitization and HTML escaping script logic', () => {
    const html = renderAdminDashboardView();

    // Extract sanitizeUrl function implementation from renderAdminDashboardView string
    const sanitizeUrlMatch = html.match(/function sanitizeUrl\(url\) \{[\s\S]*?\n    \}/);
    expect(sanitizeUrlMatch).not.toBeNull();

    const escapeHtmlMatch = html.match(/function escapeHtml\(str\) \{[\s\S]*?\n    \}/);
    expect(escapeHtmlMatch).not.toBeNull();

    // Evaluate sanitizeUrl and escapeHtml in a function to test behavior directly
    const sanitizeUrl = new Function('url', `
      const window = { location: { origin: 'https://admin.example.com' } };
      ${sanitizeUrlMatch![0]}
      return sanitizeUrl(url);
    `);

    // Test URL sanitization logic
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(sanitizeUrl('https://x.com/user/status/12345')).toBe('https://x.com/user/status/12345');
    expect(sanitizeUrl('http://example.com/feed')).toBe('http://example.com/feed');

    // Test escapeHtml logic
    const escapeHtml = new Function('str', `
      ${escapeHtmlMatch![0]}
      return escapeHtml(str);
    `);

    expect(escapeHtml("<script>alert('xss')</script>")).toBe("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");
    expect(escapeHtml('Hello "World" & \'Friends\'')).toBe("Hello &quot;World&quot; &amp; &#39;Friends&#39;");
  });
});
