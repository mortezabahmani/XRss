import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseConfig, getRuntimeConfig, saveRuntimeConfig, Env } from '../../src/config/index';

describe('Config Module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseConfig', () => {
    it('uses default values when environment variables are empty', () => {
      const env: Env = {};
      const config = parseConfig(env);

      expect(config.environment).toBe('production');
      expect(config.feedTitle).toBe('XRSS Feed');
      expect(config.feedLink).toBe('https://xrss.local');
      expect(config.feedDescription).toBe('Secure self-hosted RSS feed converted by XRSS');
      expect(config.providerEndpoint).toBe('');
      expect(config.xUsername).toBe('');
      expect(config.adminToken).toBeUndefined();
      expect(config.maxPosts).toBe(100);
    });

    it('parses custom environment variables correctly and strips leading @ from username', () => {
      const env: Env = {
        ENVIRONMENT: 'staging',
        FEED_TITLE: 'Custom Feed',
        FEED_LINK: 'https://example.com/rss',
        FEED_DESCRIPTION: 'Custom Description',
        PROVIDER_ENDPOINT: 'https://api.vxtwitter.com',
        X_USERNAME: '@testuser',
        ADMIN_TOKEN: 'secret-token-123',
        MAX_POSTS: '50'
      };

      const config = parseConfig(env, 'https://my-worker.subdomain.workers.dev/feed');

      expect(config.environment).toBe('staging');
      expect(config.feedTitle).toBe('Custom Feed');
      expect(config.feedLink).toBe('https://example.com/rss');
      expect(config.feedDescription).toBe('Custom Description');
      expect(config.providerEndpoint).toBe('https://api.vxtwitter.com');
      expect(config.xUsername).toBe('testuser');
      expect(config.adminToken).toBe('secret-token-123');
      expect(config.maxPosts).toBe(50);
    });

    it('derives feedLink origin from requestUrl if FEED_LINK is not set', () => {
      const env: Env = {};
      const config = parseConfig(env, 'https://my-domain.com/rss?param=1');

      expect(config.feedLink).toBe('https://my-domain.com');
    });

    it('formats default feedTitle and feedDescription with xUsername when provided', () => {
      const env: Env = {
        X_USERNAME: 'elonmusk'
      };
      const config = parseConfig(env);

      expect(config.feedTitle).toBe('@elonmusk on X');
      expect(config.feedDescription).toBe('Public posts from @elonmusk on X');
    });
  });

  describe('getRuntimeConfig', () => {
    it('returns base parsed config when no KV or DB is present', async () => {
      const env: Env = {
        X_USERNAME: 'default_user'
      };

      const config = await getRuntimeConfig(env);
      expect(config.xUsername).toBe('default_user');
    });

    it('loads runtime overrides from KV storage when env.KV is present', async () => {
      const mockKvGet = vi.fn().mockResolvedValue({
        xUsername: '@kv_user',
        providerEndpoint: 'https://kv-provider.com',
        feedTitle: 'KV Feed Title',
        feedDescription: 'KV Feed Description',
        maxPosts: '25'
      });

      const env: Env = {
        KV: { get: mockKvGet } as any
      };

      const config = await getRuntimeConfig(env);

      expect(mockKvGet).toHaveBeenCalledWith('app_config', 'json');
      expect(config.xUsername).toBe('kv_user');
      expect(config.providerEndpoint).toBe('https://kv-provider.com');
      expect(config.feedTitle).toBe('KV Feed Title');
      expect(config.feedDescription).toBe('KV Feed Description');
      expect(config.maxPosts).toBe(25);
    });

    it('handles non-object or missing values gracefully from KV storage', async () => {
      const mockKvGet = vi.fn().mockResolvedValue('invalid string value');

      const env: Env = {
        X_USERNAME: 'fallback_user',
        KV: { get: mockKvGet } as any
      };

      const config = await getRuntimeConfig(env);

      expect(config.xUsername).toBe('fallback_user');
    });

    it('loads runtime overrides from D1 Database when env.DB is present and KV is absent', async () => {
      const dbRow = {
        value: JSON.stringify({
          xUsername: 'd1_user',
          providerEndpoint: 'https://d1-provider.com',
          feedTitle: 'D1 Feed Title',
          feedDescription: 'D1 Feed Description',
          maxPosts: '30'
        })
      };

      const mockFirst = vi.fn().mockResolvedValue(dbRow);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });

      const env: Env = {
        DB: { prepare: mockPrepare } as any
      };

      const config = await getRuntimeConfig(env);

      expect(mockPrepare).toHaveBeenCalledWith('SELECT value FROM metadata WHERE key = ?');
      expect(mockBind).toHaveBeenCalledWith('app_config');
      expect(config.xUsername).toBe('d1_user');
      expect(config.providerEndpoint).toBe('https://d1-provider.com');
      expect(config.feedTitle).toBe('D1 Feed Title');
      expect(config.feedDescription).toBe('D1 Feed Description');
      expect(config.maxPosts).toBe(30);
    });

    it('handles database errors or empty query results gracefully', async () => {
      const mockPrepare = vi.fn().mockImplementation(() => {
        throw new Error('Database connection error');
      });

      const env: Env = {
        X_USERNAME: 'fallback_db_user',
        DB: { prepare: mockPrepare } as any
      };

      const config = await getRuntimeConfig(env);

      expect(config.xUsername).toBe('fallback_db_user');
    });
  });

  describe('saveRuntimeConfig', () => {
    it('persists runtime config changes to KV storage', async () => {
      const mockKvGet = vi.fn().mockResolvedValue(null);
      const mockKvPut = vi.fn().mockResolvedValue(undefined);

      const env: Env = {
        X_USERNAME: 'initial_user',
        KV: { get: mockKvGet, put: mockKvPut } as any
      };

      await saveRuntimeConfig(env, {
        xUsername: '@new_user',
        feedTitle: 'New Title',
        maxPosts: 40
      });

      expect(mockKvPut).toHaveBeenCalledWith(
        'app_config',
        JSON.stringify({
          xUsername: 'new_user',
          providerEndpoint: '',
          feedTitle: 'New Title',
          feedDescription: 'Public posts from @initial_user on X',
          maxPosts: 40
        })
      );
    });

    it('persists runtime config changes to D1 Database', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockRun = vi.fn().mockResolvedValue(undefined);

      const mockPrepare = vi.fn((query: string) => {
        if (query.includes('SELECT')) {
          return { bind: mockBind };
        }
        if (query.includes('INSERT')) {
          return { bind: vi.fn().mockReturnValue({ run: mockRun }) };
        }
        return { run: mockRun };
      });

      const env: Env = {
        DB: { prepare: mockPrepare } as any
      };

      await saveRuntimeConfig(env, {
        providerEndpoint: 'https://new-provider.com',
        feedDescription: 'New Description'
      });

      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS metadata'));
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT OR REPLACE INTO metadata'));
    });
  });
});
