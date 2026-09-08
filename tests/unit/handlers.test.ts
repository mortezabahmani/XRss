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
      X_AUTH_TOKEN: 'mock_auth_token_123',
      X_CT0: 'mock_ct0_csrf_456',
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

    it('rejects invalid admin token with status 401', async () => {
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

    it('authenticates valid token, returns 200 ok, and sets session cookie', async () => {
      const req = new Request('https://example.com/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: adminToken })
      });
      const res = await handleAdminLogin(req, mockEnv);

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json).toEqual({ ok: true });

      const setCookie = res.headers.get('Set-Cookie');
      expect(setCookie).toBeDefined();
      expect(setCookie).toContain('xrss_session=secret-admin-token-123');
      expect(setCookie).toContain('HttpOnly');
    });
  });

  describe('handleAdminLogout', () => {
    it('returns 200 ok and clears session cookie', async () => {
      const req = new Request('https://example.com/admin/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      const res = await handleAdminLogout(req, mockEnv);

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json).toEqual({ ok: true });

      const setCookie = res.headers.get('Set-Cookie');
      expect(setCookie).toContain('xrss_session=;');
      expect(setCookie).toContain('Max-Age=0');
    });
  });

  describe('handleAdmin', () => {
    it('returns 401 login HTML view when unauthenticated', async () => {
      const req = new Request('https://example.com/admin');
      const res = await handleAdmin(req, mockEnv);

      expect(res.status).toBe(401);
      const html = await res.text();
      expect(html).toContain('XRSS Control Center');
      expect(html).toContain('Access Control Center');
    });

    it('returns 200 dashboard HTML view when authenticated via Bearer token', async () => {
      const req = new Request('https://example.com/admin', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const res = await handleAdmin(req, mockEnv);

      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('XRSS Control Center');
      expect(html).toContain('Cached Posts');
    });
  });

  describe('handleConfigApi', () => {
    it('returns 401 when unauthenticated', async () => {
      const req = new Request('https://example.com/api/config');
      const res = await handleConfigApi(req, mockEnv);

      expect(res.status).toBe(401);
    });

    it('returns current runtime config on GET when authenticated', async () => {
      const req = new Request('https://example.com/api/config', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const res = await handleConfigApi(req, mockEnv);

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.xUsername).toBe('testuser');
      expect(json.feedTitle).toBe('Test Feed Title');
    });

    it('updates runtime config on POST when authenticated', async () => {
      mockEnv.KV = createMockKV();
      const req = new Request('https://example.com/api/config', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          xUsername: 'newusername',
          feedTitle: 'New Title'
        })
      });
      const res = await handleConfigApi(req, mockEnv);

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json).toEqual({ success: true });

      const storedRaw = await mockEnv.KV.get('app_config');
      expect(storedRaw).toBeDefined();
    });
  });

  describe('handleStats', () => {
    it('returns 401 when unauthenticated', async () => {
      const req = new Request('https://example.com/api/stats');
      const res = await handleStats(req, mockEnv);

      expect(res.status).toBe(401);
    });

    it('returns system health, metrics, and posts list on GET when authenticated', async () => {
      const mockPosts: InternalPost[] = [
        {
          id: 'p1',
          url: 'https://x.com/test/status/1',
          title: 'Post 1',
          content: 'Content 1',
          author: 'test',
          publishedAt: new Date().toISOString()
        }
      ];

      mockEnv.KV = createMockKV({
        posts: JSON.stringify(mockPosts),
        last_update: '2026-03-08T12:00:00Z',
        last_error: null
      });

      const req = new Request('https://example.com/api/stats', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const res = await handleStats(req, mockEnv);

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.status).toBe('healthy');
      expect(json.count).toBe(1);
      expect(json.storage).toBe('kv');
      expect(json.lastUpdate).toBe('2026-03-08T12:00:00Z');
      expect(json.posts).toHaveLength(1);
      expect(json.posts[0].id).toBe('p1');
    });
  });

  describe('handleHealth', () => {
    it('returns healthy status JSON without authentication requirement', async () => {
      const req = new Request('https://example.com/health');
      const res = await handleHealth(req, mockEnv);

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.status).toBe('healthy');
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('runSync & handleUpdate', () => {
    it('runSync fetches posts from provider and persists to storage', async () => {
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

      const result = await runSync(mockEnv, 'https://example.com/update');
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
      expect(xml).toContain('Test Feed Title');
    });

    it('returns stored posts in RSS XML format', async () => {
      const mockPosts: InternalPost[] = [
        {
          id: 'post-100',
          url: 'https://x.com/testuser/status/100',
          title: 'Stored Tweet Title',
          content: '<p>Tweet content</p>',
          author: 'testuser',
          publishedAt: '2026-03-08T10:00:00Z'
        }
      ];

      mockEnv.KV = createMockKV({
        posts: JSON.stringify(mockPosts)
      });

      const req = new Request('https://example.com/feed');
      const res = await handleFeed(req, mockEnv);

      expect(res.status).toBe(200);
      const xml = await res.text();
      expect(xml).toContain('Stored Tweet Title');
      expect(xml).toContain('https://x.com/testuser/status/100');
    });
  });
});
