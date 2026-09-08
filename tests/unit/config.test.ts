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
      xAuthToken: '',
      xCrfToken: '',
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
      X_AUTH_TOKEN: 'token_123',
      X_CT0: 'ct0_456',
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
      xAuthToken: 'token_123',
      xCrfToken: 'ct0_456',
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
    const config = parseConfig(env, 'https://my-worker.workers.dev/feed.xml');

    expect(config.feedLink).toBe('https://my-worker.workers.dev');
  });

  it('handles invalid requestUrl by falling back to default origin without throwing', () => {
    const env: Env = {};
    const config = parseConfig(env, 'invalid-url-string');

    expect(config.feedLink).toBe('https://xrss.local');
  });
});

describe('Runtime Config (getRuntimeConfig & saveRuntimeConfig)', () => {
  it('loads config overrides from KV when available', async () => {
    const kvStore = new Map<string, string>();
    kvStore.set('app_config', JSON.stringify({
      xUsername: 'kvuser',
      xAuthToken: 'kv_token',
      xCrfToken: 'kv_ct0',
      feedTitle: 'KV Feed Title',
      maxPosts: 25
    }));

    const mockKv = {
      get: vi.fn(async (key: string, type?: string) => {
        const val = kvStore.get(key);
        if (!val) return null;
        return type === 'json' ? JSON.parse(val) : val;
      })
    } as unknown as KVNamespace;

    const env: Env = { KV: mockKv };
    const config = await getRuntimeConfig(env);

    expect(config.xUsername).toBe('kvuser');
    expect(config.xAuthToken).toBe('kv_token');
    expect(config.xCrfToken).toBe('kv_ct0');
    expect(config.feedTitle).toBe('KV Feed Title');
    expect(config.maxPosts).toBe(25);
  });

  it('saves config to KV and DB with AES-256 encryption at rest when saveRuntimeConfig is called', async () => {
    const kvStore = new Map<string, string>();
    const mockKv = {
      get: vi.fn(async (key: string, type?: string) => {
        const val = kvStore.get(key);
        if (!val) return null;
        return type === 'json' ? JSON.parse(val) : val;
      }),
      put: vi.fn(async (key: string, value: string) => {
        kvStore.set(key, value);
      })
    } as unknown as KVNamespace;

    const env: Env = { KV: mockKv, ADMIN_TOKEN: 'master_secret_key_123' };

    await saveRuntimeConfig(env, {
      xUsername: '@saveduser',
      xAuthToken: 'saved_token',
      xCrfToken: 'saved_ct0',
      feedTitle: 'Saved Title',
      maxPosts: 75
    });

    const savedRaw = kvStore.get('app_config');
    expect(savedRaw).toBeDefined();
    const saved = JSON.parse(savedRaw!);
    expect(saved.xUsername).toBe('saveduser');
    expect(saved.xAuthToken).toContain('enc:v1:');
    expect(saved.xCrfToken).toContain('enc:v1:');
    expect(saved.feedTitle).toBe('Saved Title');
    expect(saved.maxPosts).toBe(75);

    // Verify getRuntimeConfig decrypts back to original plaintext values
    const loaded = await getRuntimeConfig(env);
    expect(loaded.xAuthToken).toBe('saved_token');
    expect(loaded.xCrfToken).toBe('saved_ct0');
  });

  it('throws "cookie decrypt failed; re-save cookies or set secrets" when stored encrypted cookies fail to decrypt', async () => {
    const kvStore = new Map<string, string>();
    kvStore.set(
      'app_config',
      JSON.stringify({
        xUsername: 'encuser',
        xAuthToken: 'enc:v1:00112233445566778899aabb:00112233445566778899aabbccdd',
        xCrfToken: 'enc:v1:00112233445566778899aabb:00112233445566778899aabbccdd'
      })
    );

    const mockKv = {
      get: vi.fn(async (key: string, type?: string) => {
        const val = kvStore.get(key);
        if (!val) return null;
        return type === 'json' ? JSON.parse(val) : val;
      })
    } as unknown as KVNamespace;

    const env: Env = { KV: mockKv, ADMIN_TOKEN: 'wrong_key_123' };

    await expect(getRuntimeConfig(env)).rejects.toThrow(
      'cookie decrypt failed; re-save cookies or set secrets'
    );
  });

  it('prefers environment secrets X_AUTH_TOKEN and X_CT0 over stored encrypted cookies', async () => {
    const kvStore = new Map<string, string>();
    kvStore.set(
      'app_config',
      JSON.stringify({
        xUsername: 'encuser',
        xAuthToken: 'enc:v1:badiv:badcipher',
        xCrfToken: 'enc:v1:badiv:badcipher'
      })
    );

    const mockKv = {
      get: vi.fn(async (key: string, type?: string) => {
        const val = kvStore.get(key);
        if (!val) return null;
        return type === 'json' ? JSON.parse(val) : val;
      })
    } as unknown as KVNamespace;

    const env: Env = {
      KV: mockKv,
      X_AUTH_TOKEN: 'env_secret_auth',
      X_CT0: 'env_secret_ct0'
    };

    const config = await getRuntimeConfig(env);
    expect(config.xAuthToken).toBe('env_secret_auth');
    expect(config.xCrfToken).toBe('env_secret_ct0');
  });
});
