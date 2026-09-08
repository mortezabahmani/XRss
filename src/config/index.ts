import { encryptSecret, decryptSecret } from '../security/encryption';

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
  const masterKey = env.ADMIN_TOKEN || 'xrss-default-key';

  let storedConfig: Record<string, any> | null = null;

  try {
    if (env.KV) {
      storedConfig = await env.KV.get('app_config', 'json');
    } else if (env.DB) {
      const res = await env.DB.prepare('SELECT value FROM metadata WHERE key = ?').bind('app_config').first();
      if (res && res.value) {
        storedConfig = JSON.parse(res.value as string);
      }
    }
  } catch (err) {
    console.error('Failed to load runtime config from storage:', err);
  }

  if (storedConfig && typeof storedConfig === 'object') {
    if (storedConfig.xUsername !== undefined) {
      base.xUsername = String(storedConfig.xUsername).replace(/^@/, '').trim();
    }

    const envAuthToken = (env.X_AUTH_TOKEN || '').trim();
    const envCrfToken = (env.X_CT0 || '').trim();

    if (envAuthToken) {
      base.xAuthToken = envAuthToken;
    } else if (storedConfig.xAuthToken) {
      const rawStoredToken = String(storedConfig.xAuthToken);
      const decToken = await decryptSecret(rawStoredToken, masterKey);
      if (rawStoredToken.startsWith('enc:v1:') && !decToken) {
        throw new Error('cookie decrypt failed; re-save cookies or set secrets');
      }
      base.xAuthToken = decToken;
    }

    if (envCrfToken) {
      base.xCrfToken = envCrfToken;
    } else if (storedConfig.xCrfToken) {
      const rawStoredCrf = String(storedConfig.xCrfToken);
      const decCrf = await decryptSecret(rawStoredCrf, masterKey);
      if (rawStoredCrf.startsWith('enc:v1:') && !decCrf) {
        throw new Error('cookie decrypt failed; re-save cookies or set secrets');
      }
      base.xCrfToken = decCrf;
    }

    if (storedConfig.providerEndpoint !== undefined) base.providerEndpoint = String(storedConfig.providerEndpoint).trim();
    if (storedConfig.feedTitle) base.feedTitle = String(storedConfig.feedTitle);
    if (storedConfig.feedDescription) base.feedDescription = String(storedConfig.feedDescription);
    if (storedConfig.maxPosts) base.maxPosts = Number(storedConfig.maxPosts) || base.maxPosts;
  }

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
  const masterKey = env.ADMIN_TOKEN || 'xrss-default-key';

  const cleanUsername = (config.xUsername !== undefined ? config.xUsername : current.xUsername).replace(/^@/, '').trim();
  const endpoint = (config.providerEndpoint !== undefined ? config.providerEndpoint : current.providerEndpoint).trim();

  // If xAuthToken is empty or '***', preserve current token!
  let finalAuthToken = current.xAuthToken;
  if (config.xAuthToken !== undefined && config.xAuthToken.trim() !== '' && config.xAuthToken.trim() !== '***') {
    finalAuthToken = config.xAuthToken.trim();
  }

  // If xCrfToken is empty or '***', preserve current token!
  let finalCrfToken = current.xCrfToken;
  if (config.xCrfToken !== undefined && config.xCrfToken.trim() !== '' && config.xCrfToken.trim() !== '***') {
    finalCrfToken = config.xCrfToken.trim();
  }

  // Encrypt sensitive cookies before saving to storage
  const encAuthToken = finalAuthToken ? await encryptSecret(finalAuthToken, masterKey) : '';
  const encCrfToken = finalCrfToken ? await encryptSecret(finalCrfToken, masterKey) : '';

  const payload = {
    xUsername: cleanUsername,
    xAuthToken: encAuthToken,
    xCrfToken: encCrfToken,
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
