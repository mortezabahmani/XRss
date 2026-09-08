export interface Env {
  DB?: D1Database;
  KV?: KVNamespace;
  ENVIRONMENT?: string;
  FEED_TITLE?: string;
  FEED_LINK?: string;
  FEED_DESCRIPTION?: string;
  PROVIDER_ENDPOINT?: string;
  ADMIN_TOKEN?: string;
}

export interface AppConfig {
  environment: string;
  feedTitle: string;
  feedLink?: string;
  feedDescription: string;
  providerEndpoint: string;
  adminToken?: string;
}

export function parseConfig(env: Env, requestUrl?: string): AppConfig {
  let origin = 'https://xrss.local';
  if (requestUrl) {
    try {
      origin = new URL(requestUrl).origin;
    } catch {}
  }

  return {
    environment: env.ENVIRONMENT || 'production',
    feedTitle: env.FEED_TITLE || 'XRSS Feed',
    feedLink: env.FEED_LINK || origin,
    feedDescription: env.FEED_DESCRIPTION || 'Secure self-hosted RSS feed converted by XRSS',
    providerEndpoint: env.PROVIDER_ENDPOINT || 'https://api.example.com/posts',
    adminToken: env.ADMIN_TOKEN
  };
}
