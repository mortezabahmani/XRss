import { Env } from './core/env';
import { D1StorageAdapter } from './storage/storage_adapter';
import { KVStorageAdapter } from './storage/kv_storage';
import { HttpDataProvider } from './providers/http_provider';
import { generateRssFeed } from './rss/generator';
import { addSecurityHeaders, verifyAdminAuth } from './security/middleware';
import { StorageAdapter, InternalPost } from './core/types';
import { getAdminDashboardHtml, getAdminLoginHtml } from './ui/admin_dashboard';

function getStorage(env: Env): StorageAdapter | null {
  if (env.KV) {
    return new KVStorageAdapter(env.KV);
  }
  if (env.DB) {
    return new D1StorageAdapter(env.DB);
  }
  return null;
}

interface AppConfig {
  endpoint?: string;
  title?: string;
  description?: string;
}

async function getConfig(storage: StorageAdapter | null, env: Env): Promise<AppConfig> {
  let stored: AppConfig = {};
  if (storage && 'getPosts' in storage) {
    // If kv storage, we can store config under a special key or metadata table
    // For D1 or KV, let's implement a clean get/set config helper or use metadata
  }
  // Fallback to Env vars or KV storage if KV is available
  if (env.KV) {
    try {
      const raw = await env.KV.get('app_config', 'json');
      if (raw && typeof raw === 'object') {
        stored = raw as AppConfig;
      }
    } catch {}
  }
  return {
    endpoint: stored.endpoint || env.PROVIDER_ENDPOINT || 'https://api.example.com/posts',
    title: stored.title || env.FEED_TITLE || 'XRSS Feed',
    description: stored.description || env.FEED_DESCRIPTION || 'Secure self-hosted RSS feed converted by XRSS'
  };
}

async function saveConfig(storage: StorageAdapter | null, env: Env, config: AppConfig): Promise<void> {
  if (env.KV) {
    await env.KV.put('app_config', JSON.stringify(config));
  }
  // Also support D1 metadata if D1 is used
  if (env.DB) {
    const adapter = new D1StorageAdapter(env.DB);
    try {
      await adapter.initSchema();
      // Store config in metadata table
      await env.DB.prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)')
        .bind('app_config', JSON.stringify(config)).run();
    } catch {}
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const storage = getStorage(env);

    if (url.pathname === '/admin') {
      const authHeader = request.headers.get('Authorization') || '';
      const queryToken = url.searchParams.get('token') || '';
      const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';
      const providedToken = bearerToken || queryToken;

      if (env.ADMIN_TOKEN && providedToken !== env.ADMIN_TOKEN) {
        const loginRes = new Response(getAdminLoginHtml(), {
          status: 401,
          headers: { 'Content-Type': 'text/html; charset=UTF-8' }
        });
        return addSecurityHeaders(loginRes);
      }

      const html = getAdminDashboardHtml();
      const res = new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=UTF-8' }
      });
      return addSecurityHeaders(res);
    }

    if (url.pathname === '/config') {
      if (request.method === 'GET') {
        if (!verifyAdminAuth(request, env.ADMIN_TOKEN)) {
          return addSecurityHeaders(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
        }
        const cfg = await getConfig(storage, env);
        return addSecurityHeaders(new Response(JSON.stringify(cfg), {
          headers: { 'Content-Type': 'application/json' }
        }));
      }

      if (request.method === 'POST') {
        if (!verifyAdminAuth(request, env.ADMIN_TOKEN)) {
          return addSecurityHeaders(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
        }
        try {
          const body = (await request.json()) as AppConfig;
          await saveConfig(storage, env, {
            endpoint: body.endpoint || '',
            title: body.title || '',
            description: body.description || ''
          });
          return addSecurityHeaders(new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          }));
        } catch (error) {
          return addSecurityHeaders(new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
      }

      return addSecurityHeaders(new Response('Method not allowed', { status: 405 }));
    }

    if (url.pathname === '/health' || url.pathname === '/status') {
      const res = new Response(JSON.stringify({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        storage: env.KV ? 'kv' : (env.DB ? 'd1' : 'none')
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      return addSecurityHeaders(res);
    }

    if (url.pathname === '/update') {
      if (request.method !== 'POST') {
        return addSecurityHeaders(new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 }));
      }

      if (!verifyAdminAuth(request, env.ADMIN_TOKEN)) {
        return addSecurityHeaders(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
      }

      try {
        const cfg = await getConfig(storage, env);
        const endpoint = cfg.endpoint || env.PROVIDER_ENDPOINT || 'https://api.example.com/posts';
        const provider = new HttpDataProvider({ endpoint });
        const posts = await provider.fetchPosts();

        if (posts.length > 0) {
          if (storage) {
            await storage.savePosts(posts);
            await storage.setLastUpdate(new Date().toISOString());
          }
        }

        return addSecurityHeaders(new Response(JSON.stringify({ success: true, count: posts.length }), {
          headers: { 'Content-Type': 'application/json' }
        }));
      } catch (error) {
        return addSecurityHeaders(new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
    }

    // Default: Serve RSS Feed
    try {
      let posts: InternalPost[] = [];
      if (storage) {
        if (env.DB && storage instanceof D1StorageAdapter) {
          try {
            await (storage as D1StorageAdapter).initSchema();
          } catch {}
        }
        posts = await storage.getPosts();
      }

      if (posts.length === 0) {
        posts = [{
          id: 'welcome',
          url: url.origin,
          title: 'XRSS Feed Operational',
          content: '<p>XRSS is active and ready to convert posts into RSS 2.0.</p>',
          author: 'XRSS System',
          publishedAt: new Date().toISOString()
        }];
      }

      const cfg = await getConfig(storage, env);
      const feedXml = generateRssFeed({
        title: cfg.title || 'XRSS Feed',
        link: env.FEED_LINK || url.origin,
        description: cfg.description || 'Secure self-hosted RSS feed converted by XRSS'
      }, posts);

      const res = new Response(feedXml, {
        headers: {
          'Content-Type': 'application/rss+xml; charset=UTF-8',
          'Cache-Control': 'public, max-age=300'
        }
      });
      return addSecurityHeaders(res);
    } catch (error) {
      const res = new Response(`Error generating feed: ${(error as Error).message}`, { status: 500 });
      return addSecurityHeaders(res);
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const storage = getStorage(env);
    if (!storage) return;

    try {
      if (env.DB && storage instanceof D1StorageAdapter) {
        try {
          await (storage as D1StorageAdapter).initSchema();
        } catch {}
      }
      const cfg = await getConfig(storage, env);
      const endpoint = cfg.endpoint || env.PROVIDER_ENDPOINT;
      if (!endpoint) return;

      const provider = new HttpDataProvider({ endpoint });
      const posts = await provider.fetchPosts();

      if (posts.length > 0) {
        await storage.savePosts(posts);
        await storage.setLastUpdate(new Date().toISOString());
      }
    } catch (error) {
      console.error('Scheduled update failed:', error);
    }
  }
};
