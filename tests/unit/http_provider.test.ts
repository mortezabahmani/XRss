import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpDataProvider } from '../../src/providers/http_provider';

describe('HttpDataProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('parses RSS XML items with CDATA and fallbacks correctly', async () => {
    const xmlInput = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
        <channel>
          <title>Test Feed</title>
          <item>
            <title><![CDATA[Test Title 1]]></title>
            <link>https://example.com/item1</link>
            <content:encoded><![CDATA[<p>Content inside encoded block</p>]]></content:encoded>
            <pubDate>Mon, 09 Mar 2026 10:00:00 GMT</pubDate>
            <dc:creator><![CDATA[Jane Doe]]></dc:creator>
            <guid isPermaLink="false">item-1-guid</guid>
          </item>
        </channel>
      </rss>`;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/rss+xml' },
        text: () => Promise.resolve(xmlInput)
      })
    );

    const provider = new HttpDataProvider({ endpoint: 'https://example.com/rss' });
    const posts = await provider.fetchPosts();

    expect(posts).toHaveLength(1);
    expect(posts[0].id).toBe('item-1-guid');
    expect(posts[0].url).toBe('https://example.com/item1');
    expect(posts[0].title).toBe('Test Title 1');
    expect(posts[0].content).toBe('<p>Content inside encoded block</p>');
    expect(posts[0].author).toBe('Jane Doe');
    expect(posts[0].publishedAt).toBe('2026-03-09T10:00:00.000Z');
  });

  it('handles JSON endpoint responses', async () => {
    const jsonInput = [
      {
        id: 'json-1',
        url: 'https://example.com/json/1',
        title: 'JSON Title',
        content: 'JSON content',
        publishedAt: '2026-03-09T12:00:00Z'
      }
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify(jsonInput))
      })
    );

    const provider = new HttpDataProvider({ endpoint: 'https://example.com/json' });
    const posts = await provider.fetchPosts();

    expect(posts).toHaveLength(1);
    expect(posts[0].id).toBe('json-1');
    expect(posts[0].title).toBe('JSON Title');
  });

  it('throws error when fetch returns HTTP error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })
    );

    const provider = new HttpDataProvider({ endpoint: 'https://example.com/error' });
    await expect(provider.fetchPosts()).rejects.toThrow('Provider HTTP error: 500 Internal Server Error');
  });
});
