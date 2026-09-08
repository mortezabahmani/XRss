export interface Env {
  DB?: D1Database;
  KV?: KVNamespace;
  ENVIRONMENT?: string;
  FEED_TITLE?: string;
  FEED_LINK?: string;
  FEED_DESCRIPTION?: string;
  PROVIDER_ENDPOINT?: string;
  X_USERNAME?: string;
  X_AUTH_TOKEN?: string;
  X_CT0?: string;
  ADMIN_TOKEN?: string;
  MAX_POSTS?: string;
}

export interface AppConfig {
  environment: string;
  feedTitle: string;
  feedLink?: string;
  feedDescription: string;
  providerEndpoint: string;
  xUsername: string;
  xAuthToken: string;
  xCrfToken: string;
  adminToken?: string;
  maxPosts: number;
}

export function parseConfig(env: Env, requestUrl?: string): AppConfig {
  let origin = 'https://xrss.local';
  if (requestUrl) {
    try {
      origin = new URL(requestUrl).origin;
    } catch {}
  }

  const xUsername = (env.X_USERNAME || '').replace(/^@/, '').trim();
  const providerEndpoint = (env.PROVIDER_ENDPOINT || '').trim();
  const xAuthToken = (env.X_AUTH_TOKEN || '').trim();
  const xCrfToken = (env.X_CT0 || '').trim();

  return {
    environment: env.ENVIRONMENT || 'production',
    feedTitle: env.FEED_TITLE || (xUsername ? `@${xUsername} on X` : 'XRSS Feed'),
    feedLink: env.FEED_LINK || origin,
    feedDescription: env.FEED_DESCRIPTION || (xUsername ? `Public posts from @${xUsername} on X` : 'Secure self-hosted RSS feed converted by XRSS'),
    providerEndpoint,
    xUsername,
    xAuthToken,
    xCrfToken,
    adminToken: env.ADMIN_TOKEN,
    maxPosts: env.MAX_POSTS ? parseInt(env.MAX_POSTS, 10) : 100
  };
}

export async function getRuntimeConfig(env: Env, requestUrl?: string): Promise<AppConfig> {
  const base = parseConfig(env, requestUrl);
  try {
    if (env.KV) {
      const raw = await env.KV.get('app_config', 'json');
      if (raw && typeof raw === 'object') {
        const c = raw as Record<string, any>;
        if (c.xUsername !== undefined) base.xUsername = String(c.xUsername).replace(/^@/, '').trim();
        if (c.xAuthToken !== undefined) base.xAuthToken = String(c.xAuthToken).trim();
        if (c.xCrfToken !== undefined) base.xCrfToken = String(c.xCrfToken).trim();
        if (c.providerEndpoint !== undefined) base.providerEndpoint = String(c.providerEndpoint).trim();
        if (c.feedTitle) base.feedTitle = String(c.feedTitle);
        if (c.feedDescription) base.feedDescription = String(c.feedDescription);
        if (c.maxPosts) base.maxPosts = Number(c.maxPosts) || base.maxPosts;
      }
    } else if (env.DB) {
      const res = await env.DB.prepare('SELECT value FROM metadata WHERE key = ?').bind('app_config').first();
      if (res && res.value) {
        const c = JSON.parse(res.value as string);
        if (c.xUsername !== undefined) base.xUsername = String(c.xUsername).replace(/^@/, '').trim();
        if (c.xAuthToken !== undefined) base.xAuthToken = String(c.xAuthToken).trim();
        if (c.xCrfToken !== undefined) base.xCrfToken = String(c.xCrfToken).trim();
        if (c.providerEndpoint !== undefined) base.providerEndpoint = String(c.providerEndpoint).trim();
        if (c.feedTitle) base.feedTitle = String(c.feedTitle);
        if (c.feedDescription) base.feedDescription = String(c.feedDescription);
        if (c.maxPosts) base.maxPosts = Number(c.maxPosts) || base.maxPosts;
      }
    }
  } catch {}
  return base;
}

export async function saveRuntimeConfig(
  env: Env,
  config: {
    xUsername?: string;
    xAuthToken?: string;
    xCrfToken?: string;
    providerEndpoint?: string;
    feedTitle?: string;
    feedDescription?: string;
    maxPosts?: number;
  }
): Promise<void> {
  const current = await getRuntimeConfig(env);
  const cleanUsername = (config.xUsername !== undefined ? config.xUsername : current.xUsername).replace(/^@/, '').trim();
  const endpoint = (config.providerEndpoint !== undefined ? config.providerEndpoint : current.providerEndpoint).trim();
  const authToken = (config.xAuthToken !== undefined ? config.xAuthToken : current.xAuthToken).trim();
  const csrfToken = (config.xCrfToken !== undefined ? config.xCrfToken : current.xCrfToken).trim();

  const payload = {
    xUsername: cleanUsername,
    xAuthToken: authToken,
    xCrfToken: csrfToken,
    providerEndpoint: endpoint,
    feedTitle: config.feedTitle?.trim() || current.feedTitle,
    feedDescription: config.feedDescription?.trim() || current.feedDescription,
    maxPosts: config.maxPosts || current.maxPosts
  };

  if (env.KV) {
    await env.KV.put('app_config', JSON.stringify(payload));
  }
  if (env.DB) {
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `).run();
      await env.DB.prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)').bind('app_config', JSON.stringify(payload)).run();
    } catch {}
  }
}
