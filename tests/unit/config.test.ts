import { describe, it, expect } from 'vitest';
import { parseConfig } from '../../src/config/index';

describe('Configuration Parser (parseConfig)', () => {
  it('handles invalid requestUrl gracefully by falling back to default origin', () => {
    const env = {};
    const config = parseConfig(env, 'invalid-url-string');

    expect(config.feedLink).toBe('https://xrss.local');
    expect(config.environment).toBe('production');
  });

  it('parses valid requestUrl origin correctly', () => {
    const env = {};
    const config = parseConfig(env, 'https://example.com/feed?user=test');

    expect(config.feedLink).toBe('https://example.com');
  });

  it('uses env.FEED_LINK when provided, overriding requestUrl origin', () => {
    const env = { FEED_LINK: 'https://custom-link.com' };
    const config = parseConfig(env, 'https://example.com/feed');

    expect(config.feedLink).toBe('https://custom-link.com');
  });

  it('parses username removing leading @ and trimming whitespace', () => {
    const env = { X_USERNAME: '@johndoe' };
    const config = parseConfig(env);

    expect(config.xUsername).toBe('johndoe');
    expect(config.feedTitle).toBe('@johndoe on X');
    expect(config.feedDescription).toBe('Public posts from @johndoe on X');
  });

  it('uses default feed title and description when username is not set', () => {
    const env = {};
    const config = parseConfig(env);

    expect(config.xUsername).toBe('');
    expect(config.feedTitle).toBe('XRSS Feed');
    expect(config.feedDescription).toBe('Secure self-hosted RSS feed converted by XRSS');
  });

  it('parses custom environment, providerEndpoint, and maxPosts correctly', () => {
    const env = {
      ENVIRONMENT: 'staging',
      PROVIDER_ENDPOINT: '  https://api.vxtwitter.com  ',
      ADMIN_TOKEN: 'secret123',
      MAX_POSTS: '50'
    };
    const config = parseConfig(env);

    expect(config.environment).toBe('staging');
    expect(config.providerEndpoint).toBe('https://api.vxtwitter.com');
    expect(config.adminToken).toBe('secret123');
    expect(config.maxPosts).toBe(50);
  });
});
