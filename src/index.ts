import { Env } from './core/env';
import { D1StorageAdapter } from './storage/storage_adapter';
import { HttpDataProvider } from './providers/http_provider';
import { generateRssFeed } from './rss/generator';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const storage = new D1StorageAdapter(env.DB);

    try {
      await storage.initSchema();
    } catch {
      // Ignore if schema already initialized
    }

    if (url.pathname === '/health' || url.pathname === '/status') {
      return new Response(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/update' && request.method === 'POST') {
      try {
        const endpoint = env.PROVIDER_ENDPOINT || 'https://api.example.com/posts';
        const provider = new HttpDataProvider({ endpoint });
        const posts = await provider.fetchPosts();

        if (posts.length > 0) {
          await storage.savePosts(posts);
          await storage.setLastUpdate(new Date().toISOString());
        }

        return new Response(JSON.stringify({ success: true, count: posts.length }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Default: Serve RSS Feed (with fallback to last known-good posts per ADR-007)
    try {
      const posts = await storage.getPosts();
      const feedXml = generateRssFeed({
        title: env.FEED_TITLE || 'XRSS Feed',
        link: env.FEED_LINK || url.origin,
        description: env.FEED_DESCRIPTION || 'Secure self-hosted RSS feed converted by XRSS'
      }, posts);

      return new Response(feedXml, {
        headers: {
          'Content-Type': 'application/rss+xml; charset=UTF-8',
          'Cache-Control': 'public, max-age=300'
        }
      });
    } catch (error) {
      return new Response(`Error generating feed: ${(error as Error).message}`, { status: 500 });
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const storage = new D1StorageAdapter(env.DB);
    try {
      await storage.initSchema();
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
      // Preserves last known-good feed per ADR-007
    }
  }
};
