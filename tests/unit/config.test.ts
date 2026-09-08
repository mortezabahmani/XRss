import { describe, it, expect, vi } from 'vitest';
import { parseConfig, getRuntimeConfig, saveRuntimeConfig, Env } from '../../src/config/index';

describe('Config Parser (parseConfig)', () => {
  it('returns default config values when env is empty and requestUrl is not provided', () => {
    const env: Env = {};
    const config = parseConfig(env);

    expect(config).toEqual({
      environment: 'production',
      feedTitle: 'XRSS Feed',
      feedLink: 'https://xrss.local',
      feedDescription: 'Secure self-hosted RSS feed converted by XRSS',
      providerEndpoint: '',
      xUsername: '',
      adminToken: undefined,
      maxPosts: 100,
    });
  });

  it('correctly parses custom environment variables', () => {
    const env: Env = {
      ENVIRONMENT: 'staging',
      FEED_TITLE: 'Custom Feed Title',
      FEED_LINK: 'https://custom.example.com/rss',
      FEED_DESCRIPTION: 'Custom Description',
      PROVIDER_ENDPOINT: '  https://api.vxtwitter.com  ',
      X_USERNAME: '@elontest',
      ADMIN_TOKEN: 'secret-admin-token',
      MAX_POSTS: '50',
    };

    const config = parseConfig(env);

    expect(config).toEqual({
      environment: 'staging',
      feedTitle: 'Custom Feed Title',
      feedLink: 'https://custom.example.com/rss',
      feedDescription: 'Custom Description',
      providerEndpoint: 'https://api.vxtwitter.com',
      xUsername: 'elontest',
      adminToken: 'secret-admin-token',
      maxPosts: 50,
    });
  });

  it('derives default feedTitle and feedDescription from xUsername when provided without title/description env vars', () => {
    const env: Env = {
      X_USERNAME: '@user123',
    };

    const config = parseConfig(env);

    expect(config.feedTitle).toBe('@user123 on X');
    expect(config.feedDescription).toBe('Public posts from @user123 on X');
    expect(config.xUsername).toBe('user123');
  });

  it('extracts origin from requestUrl if provided and FEED_LINK is not set', () => {
    const env: Env = {};
    const config = parseConfig(env, 'https://my-worker.subdomain.workers.dev/rss?foo=bar');

    expect(config.feedLink).toBe('https://my-worker.subdomain.workers.dev');
  });

  it('falls back to default origin when requestUrl is invalid', () => {
    const env: Env = {};
    const config = parseConfig(env, 'invalid-url-string');

    expect(config.feedLink).toBe('https://xrss.local');
  });

  it('parses maxPosts correctly as a number', () => {
    const env: Env = {
      MAX_POSTS: '25',
    };

    const config = parseConfig(env);
    expect(config.maxPosts).toBe(25);
  });
});

describe('Runtime Config (getRuntimeConfig & saveRuntimeConfig)', () => {
  it('loads config override from KV when present', async () => {
    const mockKvGet = vi.fn().mockResolvedValue({
      xUsername: '@kv_user',
      providerEndpoint: 'https://kv-provider.com',
      feedTitle: 'KV Feed Title',
      feedDescription: 'KV Description',
      maxPosts: 25,
    });

    const env: Env = {
      KV: {
        get: mockKvGet,
      } as any,
    };

    const config = await getRuntimeConfig(env);

    expect(mockKvGet).toHaveBeenCalledWith('app_config', 'json');
    expect(config.xUsername).toBe('kv_user');
    expect(config.providerEndpoint).toBe('https://kv-provider.com');
    expect(config.feedTitle).toBe('KV Feed Title');
    expect(config.feedDescription).toBe('KV Description');
    expect(config.maxPosts).toBe(25);
  });

  it('loads config override from DB when KV is absent', async () => {
    const mockFirst = vi.fn().mockResolvedValue({
      value: JSON.stringify({
        xUsername: '@db_user',
        providerEndpoint: 'https://db-provider.com',
        feedTitle: 'DB Feed Title',
        feedDescription: 'DB Description',
        maxPosts: 40,
      }),
    });
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });

    const env: Env = {
      DB: {
        prepare: mockPrepare,
      } as any,
    };

    const config = await getRuntimeConfig(env);

    expect(mockPrepare).toHaveBeenCalledWith('SELECT value FROM metadata WHERE key = ?');
    expect(mockBind).toHaveBeenCalledWith('app_config');
    expect(config.xUsername).toBe('db_user');
    expect(config.providerEndpoint).toBe('https://db-provider.com');
    expect(config.feedTitle).toBe('DB Feed Title');
    expect(config.feedDescription).toBe('DB Description');
    expect(config.maxPosts).toBe(40);
  });

  it('saves config to KV and DB when saveRuntimeConfig is called', async () => {
    const mockKvPut = vi.fn().mockResolvedValue(undefined);
    const mockRun = vi.fn().mockResolvedValue(undefined);
    const mockBind = vi.fn().mockReturnValue({ run: mockRun });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind, run: mockRun });

    const env: Env = {
      KV: {
        get: vi.fn().mockResolvedValue(null),
        put: mockKvPut,
      } as any,
      DB: {
        prepare: mockPrepare,
      } as any,
    };

    await saveRuntimeConfig(env, {
      xUsername: '@new_user',
      providerEndpoint: 'https://new-endpoint.com',
      feedTitle: 'New Title',
      feedDescription: 'New Description',
      maxPosts: 30,
    });

    const expectedPayload = JSON.stringify({
      xUsername: 'new_user',
      providerEndpoint: 'https://new-endpoint.com',
      feedTitle: 'New Title',
      feedDescription: 'New Description',
      maxPosts: 30,
    });

    expect(mockKvPut).toHaveBeenCalledWith('app_config', expectedPayload);
    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS metadata'));
    expect(mockPrepare).toHaveBeenCalledWith('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)');
    expect(mockBind).toHaveBeenCalledWith('app_config', expectedPayload);
  });
});
