import { describe, it, expect, vi, beforeEach } from 'vitest';
import { XFeedProvider } from '../../src/providers/x_provider';
import { parseXmlItems } from '../../src/providers/xml_parser';

describe('parseXmlItems', () => {
  it('parses valid RSS XML items with title, link, description, pubDate, author, and guid', () => {
    const xml = `
      <rss version="2.0">
        <channel>
          <title>Test Feed</title>
          <item>
            <title><![CDATA[Test Title]]></title>
            <link>https://example.com/post/1</link>
            <description><![CDATA[<p>Test content</p>]]></description>
            <pubDate>Sun, 08 Mar 2026 12:00:00 GMT</pubDate>
            <dc:creator>John Doe</dc:creator>
            <guid>post-1</guid>
          </item>
        </channel>
      </rss>
    `;

    const items = parseXmlItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      id: 'post-1',
      url: 'https://example.com/post/1',
      title: 'Test Title',
      content: '<p>Test content</p>',
      author: 'John Doe',
      pubDate: 'Sun, 08 Mar 2026 12:00:00 GMT'
    });
  });

  it('uses defaultAuthor when author tag is missing', () => {
    const xml = `
      <item>
        <title>No Author Item</title>
        <link>https://example.com/post/2</link>
      </item>
    `;

    const items = parseXmlItems(xml, 'Fallback Author');
    expect(items).toHaveLength(1);
    expect(items[0].author).toBe('Fallback Author');
    expect(items[0].id).toBe('https://example.com/post/2');
  });

  it('returns empty array for XML with no items', () => {
    const xml = `<rss><channel><title>Empty</title></channel></rss>`;
    expect(parseXmlItems(xml)).toEqual([]);
  });
});

describe('XFeedProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches authenticated X timeline using auth_token and ct0 session cookies', async () => {
    const mockTweets = [
      {
        id_str: '999111',
        full_text: 'Authenticated tweet from X API',
        created_at: 'Sun Mar 08 15:00:00 +0000 2026',
        user: { name: 'Morteza', screen_name: 'mortezaa' }
      }
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify(mockTweets))
      })
    );

    const provider = new XFeedProvider({
      username: 'mortezaa',
      authToken: 'mock_auth_token_123',
      csrfToken: 'mock_ct0_csrf_456'
    });

    const posts = await provider.fetchPosts();

    expect(posts).toHaveLength(1);
    expect(posts[0].id).toBe('999111');
    expect(posts[0].title).toBe('Authenticated tweet from X API');
    expect(posts[0].url).toContain('https://x.com/mortezaa/status/999111');
  });

  it('fetches and normalizes JSON posts for a username', async () => {
    const mockData = [
      {
        id: 'tweet-101',
        url: 'https://x.com/testuser/status/101',
        title: 'Hello X World <script>alert(1)</script>',
        content: '<p>Hello X World <script>alert(1)</script></p>',
        author: 'Test User',
        publishedAt: '2026-03-08T12:00:00Z'
      }
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify(mockData))
      })
    );

    const provider = new XFeedProvider({ username: 'testuser' });
    const posts = await provider.fetchPosts();

    expect(posts).toHaveLength(1);
    expect(posts[0].id).toBe('tweet-101');
    expect(posts[0].title).toBe('Hello X World');
    expect(posts[0].content).not.toContain('script');
  });

  it('uses optional custom endpoint override if provided', async () => {
    const mockRssXml = `
      <rss version="2.0">
        <channel>
          <title>Custom Feed</title>
          <item>
            <title>Custom Item</title>
            <link>https://example.com/custom/1</link>
            <guid>custom-1</guid>
            <description>Custom description</description>
            <pubDate>Sun, 08 Mar 2026 12:00:00 GMT</pubDate>
          </item>
        </channel>
      </rss>
    `;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/rss+xml' },
        text: () => Promise.resolve(mockRssXml)
      })
    );

    const provider = new XFeedProvider({ endpoint: 'https://example.com/custom.xml' });
    const posts = await provider.fetchPosts();

    expect(posts).toHaveLength(1);
    expect(posts[0].id).toBe('custom-1');
    expect(posts[0].title).toBe('Custom Item');
  });

  it('throws precise error when no configuration or endpoints respond', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })
    );

    const provider = new XFeedProvider({ username: 'nonexistentuser999' });
    await expect(provider.fetchPosts()).rejects.toThrow();
  });
});
