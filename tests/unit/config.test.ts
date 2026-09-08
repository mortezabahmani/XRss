import { describe, it, expect } from 'vitest';
import { parseConfig, getRuntimeConfig, saveRuntimeConfig, Env } from '../../src/config/index';

describe('Config Module', () => {
  it('parses environment configuration with defaults', () => {
    const env: Env = {
      X_USERNAME: '@testuser',
      PROVIDER_ENDPOINT: ' https://api.vxtwitter.com '
    };
    const config = parseConfig(env, 'https://example.com/rss');
    expect(config.xUsername).toBe('testuser');
    expect(config.providerEndpoint).toBe('https://api.vxtwitter.com');
    expect(config.feedTitle).toBe('@testuser on X');
    expect(config.feedLink).toBe('https://example.com');
    expect(config.maxPosts).toBe(100);
  });

  it('overrides config from KV in getRuntimeConfig', async () => {
    const kvData = JSON.stringify({
      xUsername: '@kvuser',
      providerEndpoint: 'https://api.fxtwitter.com',
      feedTitle: 'KV Feed Title',
      feedDescription: 'KV Feed Description',
      maxPosts: 50
    });

    const env: Env = {
      X_USERNAME: '@baseuser',
      KV: {
        get: async (key: string, type?: string) => {
          if (key === 'app_config' && type === 'json') {
            return JSON.parse(kvData);
          }
          return null;
        }
      } as any
    };

    const config = await getRuntimeConfig(env);
    expect(config.xUsername).toBe('kvuser');
    expect(config.providerEndpoint).toBe('https://api.fxtwitter.com');
    expect(config.feedTitle).toBe('KV Feed Title');
    expect(config.feedDescription).toBe('KV Feed Description');
    expect(config.maxPosts).toBe(50);
  });

  it('overrides config from DB in getRuntimeConfig', async () => {
    const dbData = JSON.stringify({
      xUsername: '@dbuser',
      providerEndpoint: 'https://api.fxtwitter.com',
      feedTitle: 'DB Feed Title',
      feedDescription: 'DB Feed Description',
      maxPosts: '25'
    });

    const env: Env = {
      X_USERNAME: '@baseuser',
      DB: {
        prepare: (sql: string) => ({
          bind: (...args: any[]) => ({
            first: async () => ({ key: args[0], value: dbData })
          })
        })
      } as any
    };

    const config = await getRuntimeConfig(env);
    expect(config.xUsername).toBe('dbuser');
    expect(config.providerEndpoint).toBe('https://api.fxtwitter.com');
    expect(config.feedTitle).toBe('DB Feed Title');
    expect(config.feedDescription).toBe('DB Feed Description');
    expect(config.maxPosts).toBe(25);
  });
});
