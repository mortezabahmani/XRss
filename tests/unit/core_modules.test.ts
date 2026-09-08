import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../../src/security/sanitizer';
import { validatePost } from '../../src/core/validator';
import { generateRssFeed } from '../../src/rss/generator';
import { isSafeUrl } from '../../src/security/ssrf';
import { InternalPost } from '../../src/core/types';

describe('Security & Core Modules', () => {
  it('sanitizes unsafe HTML', () => {
    const dirty = '<p>Hello <script>alert(1)</script><a href="javascript:alert(2)" onclick="evil()">Link</a></p>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('script');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('Hello');
    expect(clean).toContain('Link');
  });

  it('validates SSRF URL safety', () => {
    expect(isSafeUrl('https://example.com/feed')).toBe(true);
    expect(isSafeUrl('http://localhost/admin')).toBe(false);
    expect(isSafeUrl('http://127.0.0.1/internal')).toBe(false);
    expect(isSafeUrl('http://169.254.169.254/latest/meta-data')).toBe(false);
  });

  it('validates correct and incorrect posts', () => {
    const validPost: InternalPost = {
      id: '123',
      url: 'https://example.com/post/123',
      title: 'Test Post',
      content: 'Content here',
      author: 'User',
      publishedAt: new Date().toISOString()
    };
    expect(validatePost(validPost)).toBe(true);

    const invalidSsrfPost = {
      ...validPost,
      url: 'http://localhost/admin'
    };
    expect(validatePost(invalidSsrfPost)).toBe(false);

    const missingTitlePost = {
      ...validPost,
      title: ''
    };
    expect(validatePost(missingTitlePost)).toBe(false);
  });

  it('generates valid RSS 2.0 XML', () => {
    const post: InternalPost = {
      id: '1',
      url: 'https://example.com/1',
      title: 'RSS Title & More',
      content: '<p>Body</p>',
      author: 'Author',
      publishedAt: '2026-03-08T00:00:00Z'
    };
    const xml = generateRssFeed({
      title: 'My Feed',
      link: 'https://example.com',
      description: 'Desc'
    }, [post]);

    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('RSS Title &amp; More');
    expect(xml).toContain('<![CDATA[<p>Body</p>]]>');
  });
});
