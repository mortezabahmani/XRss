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

export async function getRuntimeConfig(env: Env, requestUrl?: string): Promise<AppConfig> {
  const base = parseConfig(env, requestUrl);
  try {
    if (env.KV) {
      const raw = await env.KV.get('app_config', 'json');
      if (raw && typeof raw === 'object') {
        const c = raw as Record<string, string>;
        if (c.providerEndpoint) base.providerEndpoint = c.providerEndpoint;
        if (c.feedTitle) base.feedTitle = c.feedTitle;
        if (c.feedDescription) base.feedDescription = c.feedDescription;
      }
    } else if (env.DB) {
      const res = await env.DB.prepare('SELECT value FROM metadata WHERE key = ?').bind('app_config').first();
      if (res && res.value) {
        const c = JSON.parse(res.value as string);
        if (c.providerEndpoint) base.providerEndpoint = c.providerEndpoint;
        if (c.feedTitle) base.feedTitle = c.feedTitle;
        if (c.feedDescription) base.feedDescription = c.feedDescription;
      }
    }
  } catch {}
  return base;
}

export async function saveRuntimeConfig(env: Env, config: { providerEndpoint?: string; feedTitle?: string; feedDescription?: string }): Promise<void> {
  const current = await getRuntimeConfig(env);
  const payload = {
    providerEndpoint: config.providerEndpoint?.trim() || current.providerEndpoint,
    feedTitle: config.feedTitle?.trim() || current.feedTitle,
    feedDescription: config.feedDescription?.trim() || current.feedDescription
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
