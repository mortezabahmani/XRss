import { describe, it, expect } from 'vitest';
import { normalizePost } from '../../src/core/normalizer';

describe('normalizePost', () => {
  it('handles null, undefined, or non-object input gracefully', () => {
    const postNull = normalizePost(null);
    expect(postNull.title).toBe('Untitled');
    expect(postNull.author).toBe('Unknown');
    expect(postNull.publishedAt).toBeDefined();

    const postString = normalizePost('invalid input');
    expect(postString.title).toBe('Untitled');
  });

  it('correctly normalizes valid post object with ISO date string', () => {
    const raw = {
      id: 'post-1',
      url: 'https://example.com/1',
      title: 'Hello World',
      content: '<p>Content</p>',
      author: 'John Doe',
      publishedAt: '2026-03-08T12:00:00.000Z',
      mediaUrls: ['https://example.com/image.jpg']
    };

    const normalized = normalizePost(raw);
    expect(normalized.id).toBe('post-1');
    expect(normalized.url).toBe('https://example.com/1');
    expect(normalized.title).toBe('Hello World');
    expect(normalized.content).toBe('<p>Content</p>');
    expect(normalized.author).toBe('John Doe');
    expect(normalized.publishedAt).toBe('2026-03-08T12:00:00.000Z');
    expect(normalized.mediaUrls).toEqual(['https://example.com/image.jpg']);
  });

  it('fallback date aliases (pubDate, date, created_at) work correctly', () => {
    const rawPubDate = { pubDate: 'Sun, 08 Mar 2026 12:00:00 GMT' };
    const rawDate = { date: '2026-03-08' };
    const rawCreatedAt = { created_at: '2026-03-08T12:00:00Z' };

    expect(normalizePost(rawPubDate).publishedAt).toBe('2026-03-08T12:00:00.000Z');
    expect(new Date(normalizePost(rawDate).publishedAt).getUTCFullYear()).toBe(2026);
    expect(normalizePost(rawCreatedAt).publishedAt).toBe('2026-03-08T12:00:00.000Z');
  });

  it('falls back to current ISO date if date string is missing or invalid', () => {
    const rawInvalidDate = { title: 'Test', publishedAt: 'invalid-date-string' };
    const rawEmptyDate = { title: 'Test', publishedAt: '' };

    const before = new Date().getTime();
    const normInvalid = normalizePost(rawInvalidDate);
    const normEmpty = normalizePost(rawEmptyDate);
    const after = new Date().getTime();

    const invalidTime = Date.parse(normInvalid.publishedAt);
    const emptyTime = Date.parse(normEmpty.publishedAt);

    expect(Number.isNaN(invalidTime)).toBe(false);
    expect(invalidTime).toBeGreaterThanOrEqual(before);
    expect(invalidTime).toBeLessThanOrEqual(after);

    expect(Number.isNaN(emptyTime)).toBe(false);
    expect(emptyTime).toBeGreaterThanOrEqual(before);
    expect(emptyTime).toBeLessThanOrEqual(after);
  });
});
