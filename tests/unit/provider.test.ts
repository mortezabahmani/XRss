import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpDataProvider } from '../../src/providers/http_provider';

describe('HttpDataProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches and normalizes JSON posts successfully', async () => {
    const mockData = [
      {
        id: '1',
        url: 'https://example.com/1',
        title: 'Post 1',
        content: '<p>Hello <script>alert(1)</script></p>',
        author: 'Author 1',
        publishedAt: '2026-03-08T12:00:00Z'
      }
    ];

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(JSON.stringify(mockData))
    }));

    const provider = new HttpDataProvider({ endpoint: 'https://api.example.com/posts' });
    const posts = await provider.fetchPosts();

    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe('Post 1');
    expect(posts[0].content).not.toContain('script');
  });

  it('handles HTTP error responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    }));

    const provider = new HttpDataProvider({ endpoint: 'https://api.example.com/posts' });
    await expect(provider.fetchPosts()).rejects.toThrow('Provider HTTP error: 404 Not Found');
  });
});
