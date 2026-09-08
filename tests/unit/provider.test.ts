import { describe, it, expect, vi, beforeEach } from 'vitest';
import { XFeedProvider } from '../../src/providers/x_provider';
import { HttpDataProvider } from '../../src/providers/http_provider';

describe('XFeedProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

  it('parses Next.js __NEXT_DATA__ timeline HTML correctly', async () => {
    const mockNextDataHtml = `
      <!DOCTYPE html>
      <html>
        <body>
          <script id="__NEXT_DATA__" type="application/json">
          {
            "props": {
              "pageProps": {
                "timeline": {
                  "entries": [
                    {
                      "entry_id": "tweet-202",
                      "content": {
                        "item": {
                          "content": {
                            "tweet": {
                              "id_str": "202",
                              "full_text": "Public announcement from @github",
                              "created_at": "Sun Mar 08 14:00:00 +0000 2026",
                              "user": { "name": "GitHub", "screen_name": "github" }
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
          </script>
        </body>
      </html>
    `;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'text/html' },
        text: () => Promise.resolve(mockNextDataHtml)
      })
    );

    const provider = new XFeedProvider({ username: 'github' });
    const posts = await provider.fetchPosts();

    expect(posts).toHaveLength(1);
    expect(posts[0].id).toBe('202');
    expect(posts[0].title).toBe('Public announcement from @github');
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
    await expect(provider.fetchPosts()).rejects.toThrow('HTTP 404 Not Found');
  });

  it('rejects unsafe SSRF target endpoints for custom X provider', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const provider = new XFeedProvider({ endpoint: 'http://169.254.169.254/latest/meta-data' });
    await expect(provider.fetchPosts()).rejects.toThrow('Invalid or unsafe provider URL');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('HttpDataProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches posts from a safe URL endpoint', async () => {
    const mockPosts = [
      {
        id: 'post-1',
        url: 'https://example.com/post-1',
        title: 'Safe Title',
        content: 'Safe content'
      }
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify(mockPosts))
      })
    );

    const provider = new HttpDataProvider({ endpoint: 'https://example.com/api/posts' });
    const posts = await provider.fetchPosts();

    expect(posts).toHaveLength(1);
    expect(posts[0].id).toBe('post-1');
  });

  it('blocks SSRF requests to localhost and private IP addresses', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const unsafeEndpoints = [
      'http://localhost/admin',
      'http://127.0.0.1:8080/internal',
      'http://10.0.0.1/secret',
      'http://169.254.169.254/latest/meta-data',
      'http://192.168.1.1/router'
    ];

    for (const url of unsafeEndpoints) {
      const provider = new HttpDataProvider({ endpoint: url });
      await expect(provider.fetchPosts()).rejects.toThrow('Invalid or unsafe provider endpoint URL');
    }

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
