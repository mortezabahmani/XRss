import { Env } from './core/env';
import { D1StorageAdapter } from './storage/storage_adapter';
import { KVStorageAdapter } from './storage/kv_storage';
import { HttpDataProvider } from './providers/http_provider';
import { generateRssFeed } from './rss/generator';
import { addSecurityHeaders, verifyAdminAuth } from './security/middleware';
import { StorageAdapter, InternalPost } from './core/types';

function getStorage(env: Env): StorageAdapter | null {
  if (env.KV) {
    return new KVStorageAdapter(env.KV);
  }
  if (env.DB) {
    return new D1StorageAdapter(env.DB);
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

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

    const storage = getStorage(env);

    if (url.pathname === '/update') {
      if (request.method !== 'POST') {
        return addSecurityHeaders(new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 }));
      }

      if (!verifyAdminAuth(request, env.ADMIN_TOKEN)) {
        return addSecurityHeaders(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
      }

      try {
        const endpoint = env.PROVIDER_ENDPOINT || 'https://api.example.com/posts';
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

      const feedXml = generateRssFeed({
        title: env.FEED_TITLE || 'XRSS Feed',
        link: env.FEED_LINK || url.origin,
        description: env.FEED_DESCRIPTION || 'Secure self-hosted RSS feed converted by XRSS'
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
      const endpoint = env.PROVIDER_ENDPOINT;
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
