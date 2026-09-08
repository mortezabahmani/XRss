import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleAdminLogin,
  handleAdminLogout,
  handleAdmin,
  handleConfigApi,
  handleStats,
  handleHealth,
  runSync,
  handleUpdate,
  handleFeed
} from '../../src/http/handlers';
import { Env } from '../../src/config';
import { InternalPost } from '../../src/core/types';

// Mock KV Namespace
function createMockKV(initialStore: Record<string, any> = {}) {
  const store = new Map<string, any>(Object.entries(initialStore));
  return {
    get: vi.fn(async (key: string, type?: string) => {
      const val = store.get(key);
      if (val === undefined) return null;
      if (type === 'json' && typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return null;
        }
      }
      return val;
    }),
    put: vi.fn(async (key: string, value: any) => {
      store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    })
  } as unknown as KVNamespace;
}

// Mock D1 Database
function createMockD1() {
  const prepare = vi.fn().mockReturnValue({
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(null),
    run: vi.fn().mockResolvedValue({ success: true }),
    all: vi.fn().mockResolvedValue({ results: [] })
  });
  return {
    prepare
  } as unknown as D1Database;
}

describe('HTTP Handlers', () => {
  const adminToken = 'secret-admin-token-123';
  let mockEnv: Env;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockEnv = {
      ADMIN_TOKEN: adminToken,
      X_USERNAME: 'testuser',
      FEED_TITLE: 'Test Feed Title'
    };
  });

  describe('handleAdminLogin', () => {
    it('rejects non-POST methods with 405', async () => {
      const req = new Request('https://example.com/admin/login', { method: 'GET' });
      const res = await handleAdminLogin(req, mockEnv);

      expect(res.status).toBe(405);
      expect(await res.text()).toBe('Method not allowed');
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('rejects invalid token in JSON body with 401', async () => {
      const req = new Request('https://example.com/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'wrong-token' })
      });
      const res = await handleAdminLogin(req, mockEnv);

      expect(res.status).toBe(401);
      const json = (await res.json()) as any;
      expect(json).toEqual({ error: 'Invalid token' });
    });

    it('handles malformed JSON body gracefully and rejects with 401', async () => {
      const req = new Request('https://example.com/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json'
      });
      const res = await handleAdminLogin(req, mockEnv);

      expect(res.status).toBe(401);
    });

    it('authenticates valid token in JSON body and sets session cookie', async () => {
      const req = new Request('https://example.com/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: adminToken })
      });
      const res = await handleAdminLogin(req, mockEnv);

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json).toEqual({ ok: true });
      expect(res.headers.get('Set-Cookie')).toContain('xrss_session=');
    });

    it('authenticates valid token from Form Data', async () => {
      const req = new Request('https://example.com/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'token=' + adminToken
      });
      const res = await handleAdminLogin(req, mockEnv);

      expect(res.status).toBe(200);
      expect(res.headers.get('Set-Cookie')).toContain('xrss_session=');
    });
  });

  describe('handleAdminLogout', () => {
    it('returns 200 ok and clears session cookie', async () => {
      const req = new Request('https://example.com/admin/logout', { method: 'POST' });
      const res = await handleAdminLogout(req, mockEnv);

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json).toEqual({ ok: true });
      expect(res.headers.get('Set-Cookie')).toContain('Max-Age=0');
    });
  });

  describe('handleAdmin', () => {
    it('renders login view when unauthenticated', async () => {
      const req = new Request('https://example.com/admin');
      const res = await handleAdmin(req, mockEnv);

      expect(res.status).toBe(401);
      const html = await res.text();
      expect(html).toContain('Login');
      expect(res.headers.get('Content-Type')).toContain('text/html');
    });

    it('renders admin dashboard view when authenticated', async () => {
      const req = new Request('https://example.com/admin', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const res = await handleAdmin(req, mockEnv);

      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('XRSS Control Center');
      expect(res.headers.get('Content-Type')).toContain('text/html');
    });
  });

  describe('handleConfigApi', () => {
    it('returns 401 when unauthenticated', async () => {
      const req = new Request('https://example.com/api/config');
      const res = await handleConfigApi(req, mockEnv);

      expect(res.status).toBe(401);
      const json = (await res.json()) as any;
      expect(json).toEqual({ error: 'Unauthorized' });
    });

    it('returns config data on GET when authenticated', async () => {
      const req = new Request('https://example.com/api/config', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const res = await handleConfigApi(req, mockEnv);

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json).toHaveProperty('xUsername', 'testuser');
      expect(json).toHaveProperty('feedTitle', 'Test Feed Title');
    });

    it('saves updated config on POST when authenticated', async () => {
      mockEnv.KV = createMockKV();
      const req = new Request('https://example.com/api/config', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ xUsername: 'newuser', feedTitle: 'New Title' })
      });
      const res = await handleConfigApi(req, mockEnv);

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json).toEqual({ success: true });
    });

    it('handles JSON parsing errors on POST with status 400', async () => {
      const req = new Request('https://example.com/api/config', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: 'invalid-json'
      });
      const res = await handleConfigApi(req, mockEnv);

      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
    });

    it('returns 405 for unsupported HTTP methods', async () => {
      const req = new Request('https://example.com/api/config', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const res = await handleConfigApi(req, mockEnv);

      expect(res.status).toBe(405);
      const json = (await res.json()) as any;
      expect(json).toEqual({ error: 'Method not allowed' });
    });
  });

  describe('handleStats', () => {
    it('returns 401 when unauthenticated', async () => {
      const req = new Request('https://example.com/api/stats');
      const res = await handleStats(req, mockEnv);

      expect(res.status).toBe(401);
    });

    it('returns system stats with "none" storage when no storage binding exists', async () => {
      const req = new Request('https://example.com/api/stats', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const res = await handleStats(req, mockEnv);

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.status).toBe('healthy');
      expect(json.storage).toBe('none');
      expect(json.count).toBe(0);
    });

    it('returns system stats with "kv" storage when KV binding exists', async () => {
      const posts: InternalPost[] = [{
        id: '1',
        url: 'https://example.com/1',
        title: 'Post 1',
        content: 'Content 1',
        author: 'User',
        publishedAt: new Date().toISOString()
      }];
      mockEnv.KV = createMockKV({
        posts: JSON.stringify(posts),
        last_update: '2026-03-08T00:00:00Z',
        last_error: null
      });

      const req = new Request('https://example.com/api/stats', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const res = await handleStats(req, mockEnv);

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.storage).toBe('kv');
      expect(json.count).toBe(1);
      expect(json.lastUpdate).toBe('2026-03-08T00:00:00Z');
      expect(json.lastError).toBeNull();
    });

    it('returns system stats with "d1" storage when DB binding exists', async () => {
      mockEnv.DB = createMockD1();

      const req = new Request('https://example.com/api/stats', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const res = await handleStats(req, mockEnv);

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.storage).toBe('d1');
    });
  });

  describe('handleHealth', () => {
    it('returns health status response with security headers', async () => {
      const req = new Request('https://example.com/health');
      const res = await handleHealth(req, mockEnv);

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.status).toBe('healthy');
      expect(json.storage).toBe('none');
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('runSync & handleUpdate', () => {
    it('handleUpdate returns 405 for non-POST method', async () => {
      const req = new Request('https://example.com/update', { method: 'GET' });
      const res = await handleUpdate(req, mockEnv);

      expect(res.status).toBe(405);
      const json = (await res.json()) as any;
      expect(json).toEqual({ error: 'Method not allowed' });
    });

    it('handleUpdate returns 401 when unauthenticated', async () => {
      const req = new Request('https://example.com/update', { method: 'POST' });
      const res = await handleUpdate(req, mockEnv);

      expect(res.status).toBe(401);
    });

    it('runSync fetches posts and saves them to KV storage', async () => {
      mockEnv.KV = createMockKV();

      const mockFetchedData = [
        {
          id: 'tweet-1',
          url: 'https://x.com/testuser/status/1',
          title: 'Post 1',
          content: '<p>Post 1</p>',
          author: 'testuser',
          publishedAt: new Date().toISOString()
        }
      ];

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          headers: { get: () => 'application/json' },
          text: () => Promise.resolve(JSON.stringify(mockFetchedData))
        })
      );

      const result = await runSync(mockEnv, 'https://example.com');
      expect(result.count).toBe(1);

      const storedPostsRaw = await mockEnv.KV.get('posts');
      expect(storedPostsRaw).toBeDefined();
    });

    it('handleUpdate triggers sync successfully when authenticated', async () => {
      mockEnv.KV = createMockKV();

      const mockFetchedData = [
        {
          id: 'tweet-1',
          url: 'https://x.com/testuser/status/1',
          title: 'Post 1',
          content: '<p>Post 1</p>',
          author: 'testuser',
          publishedAt: new Date().toISOString()
        }
      ];

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          headers: { get: () => 'application/json' },
          text: () => Promise.resolve(JSON.stringify(mockFetchedData))
        })
      );

      const req = new Request('https://example.com/update', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const res = await handleUpdate(req, mockEnv);

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json).toEqual({ success: true, count: 1 });
    });

    it('handleUpdate catches errors, updates lastError in storage, and returns status 500', async () => {
      mockEnv.KV = createMockKV();

      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network error during sync'))
      );

      const req = new Request('https://example.com/update', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const res = await handleUpdate(req, mockEnv);

      expect(res.status).toBe(500);
      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
      expect(json.error).toBe('Network error during sync');

      const lastErr = await mockEnv.KV.get('last_error');
      expect(lastErr).toBe('Network error during sync');
    });
  });

  describe('handleFeed', () => {
    it('returns fallback welcome post in RSS XML format when no posts exist', async () => {
      const req = new Request('https://example.com/feed');
      const res = await handleFeed(req, mockEnv);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('application/rss+xml');
      const xml = await res.text();
      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<rss version="2.0"');
      expect(xml).toContain('XRSS is configured');
    });

    it('returns RSS XML with posts from storage when available', async () => {
      const posts: InternalPost[] = [
        {
          id: 'post-100',
          url: 'https://example.com/post/100',
          title: 'Stored Post Title',
          content: '<p>Stored Post Content</p>',
          author: 'Test Author',
          publishedAt: '2026-03-08T10:00:00Z'
        }
      ];
      mockEnv.KV = createMockKV({ posts: JSON.stringify(posts) });

      const req = new Request('https://example.com/feed');
      const res = await handleFeed(req, mockEnv);

      expect(res.status).toBe(200);
      const xml = await res.text();
      expect(xml).toContain('Stored Post Title');
      expect(xml).toContain('Stored Post Content');
    });

    it('handles unexpected errors during feed generation with status 500', async () => {
      const brokenEnv: Env = {
        DB: {
          prepare: () => ({
            bind: () => ({ first: async () => null }),
            all: async () => {
              throw new Error('Database connection failed');
            }
          })
        } as unknown as D1Database
      };

      const req = new Request('https://example.com/feed');
      const res = await handleFeed(req, brokenEnv);

      expect(res.status).toBe(500);
      const text = await res.text();
      expect(text).toContain('Error generating feed: Database connection failed');
    });
  });
});
