import { describe, it, expect } from 'vitest';
import { normalizePost } from '../../src/core/normalizer';

describe('normalizePost', () => {
  it('returns fallback post for non-object or null/undefined inputs', () => {
    const nullResult = normalizePost(null);
    expect(nullResult).toBeDefined();
    expect(nullResult.title).toBe('Untitled');
    expect(nullResult.author).toBe('Unknown');
    expect(nullResult.url).toBe('');

    const stringResult = normalizePost('not an object');
    expect(stringResult.title).toBe('Untitled');
    expect(stringResult.author).toBe('Unknown');

    const numberResult = normalizePost(12345);
    expect(numberResult.title).toBe('Untitled');

    const undefinedResult = normalizePost(undefined);
    expect(undefinedResult.title).toBe('Untitled');
  });

  it('normalizes a complete post object', () => {
    const raw = {
      id: 'post-1',
      url: 'https://x.com/user/status/1',
      title: 'Hello World',
      content: '<p>Some content</p>',
      author: 'Jane Doe',
      publishedAt: '2026-03-08T12:00:00.000Z',
      mediaUrls: ['https://x.com/image.jpg']
    };

    const post = normalizePost(raw);
    expect(post.id).toBe('post-1');
    expect(post.url).toBe('https://x.com/user/status/1');
    expect(post.title).toBe('Hello World');
    expect(post.content).toBe('<p>Some content</p>');
    expect(post.author).toBe('Jane Doe');
    expect(post.publishedAt).toBe('2026-03-08T12:00:00.000Z');
    expect(post.mediaUrls).toEqual(['https://x.com/image.jpg']);
  });

  it('handles alternate field names (guid, link, text, description, creator, user.name, pubDate, media)', () => {
    const raw = {
      guid: 'guid-999',
      link: 'https://example.com/item/999',
      text: 'Post Title Here',
      description: 'Post description content',
      creator: 'Author Creator',
      pubDate: 'Sun, 08 Mar 2026 12:00:00 GMT',
      media: ['https://example.com/media1.png', 'https://example.com/media2.png']
    };

    const post = normalizePost(raw);
    expect(post.id).toBe('guid-999');
    expect(post.url).toBe('https://example.com/item/999');
    expect(post.title).toBe('Post Title Here');
    expect(post.content).toBe('Post description content');
    expect(post.author).toBe('Author Creator');
    expect(post.publishedAt).toBe(new Date('Sun, 08 Mar 2026 12:00:00 GMT').toISOString());
    expect(post.mediaUrls).toEqual([
      'https://example.com/media1.png',
      'https://example.com/media2.png'
    ]);
  });

  it('handles user object for author if author/creator is missing', () => {
    const raw = {
      id: '100',
      user: {
        name: 'Twitter User'
      }
    };

    const post = normalizePost(raw);
    expect(post.author).toBe('Twitter User');
  });

  it('sanitizes unsafe HTML in title and content', () => {
    const raw = {
      id: '101',
      title: 'Title <script>alert(1)</script>',
      content: '<p>Safe</p><script>evil()</script><iframe src="malicious"></iframe>'
    };

    const post = normalizePost(raw);
    expect(post.title).not.toContain('<script>');
    expect(post.content).not.toContain('<script>');
    expect(post.content).not.toContain('<iframe>');
    expect(post.content).toContain('<p>Safe</p>');
  });

  it('handles invalid date strings gracefully', () => {
    const raw = {
      id: '102',
      publishedAt: 'invalid-date-string'
    };

    const post = normalizePost(raw);
    expect(Number.isNaN(Date.parse(post.publishedAt))).toBe(false);
  });
});
