import { Env, parseConfig } from './config';
import { routeRequest } from './http/router';
import { createStorage, D1StorageAdapter } from './storage';
import { HttpDataProvider } from './providers/http_provider';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return routeRequest(request, env);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const storage = createStorage(env);
    if (!storage) return;

    try {
      if (env.DB && storage instanceof D1StorageAdapter) {
        try {
          await storage.initSchema();
        } catch {}
      }
      const config = parseConfig(env);
      if (!config.providerEndpoint) return;

      const provider = new HttpDataProvider({ endpoint: config.providerEndpoint });
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
