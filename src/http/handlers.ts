import { Env, getRuntimeConfig, saveRuntimeConfig } from '../config';
import { createStorage, D1StorageAdapter } from '../storage';
import { HttpDataProvider } from '../providers/http_provider';
import { generateRssFeed } from '../rss/generator';
import { addSecurityHeaders, verifyAdminAuth } from '../security/middleware';
import { renderAdminDashboardView, renderAdminLoginView } from '../ui/admin';
import { InternalPost } from '../core/types';

export async function handleAdmin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const authHeader = request.headers.get('Authorization') || '';
  const queryToken = url.searchParams.get('token') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';
  const providedToken = bearerToken || queryToken;

  if (env.ADMIN_TOKEN && providedToken !== env.ADMIN_TOKEN) {
    const loginRes = new Response(renderAdminLoginView(), {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=UTF-8' }
    });
    return addSecurityHeaders(loginRes);
  }

  const html = renderAdminDashboardView();
  const res = new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=UTF-8' }
  });
  return addSecurityHeaders(res);
}

export async function handleConfigApi(request: Request, env: Env): Promise<Response> {
  if (!verifyAdminAuth(request, env.ADMIN_TOKEN)) {
    return addSecurityHeaders(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
  }

  if (request.method === 'GET') {
    const cfg = await getRuntimeConfig(env, request.url);
    return addSecurityHeaders(
      new Response(
        JSON.stringify({
          providerEndpoint: cfg.providerEndpoint,
          feedTitle: cfg.feedTitle,
          feedDescription: cfg.feedDescription
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    );
  }

  if (request.method === 'POST') {
    try {
      const body = (await request.json()) as { providerEndpoint?: string; feedTitle?: string; feedDescription?: string };
      await saveRuntimeConfig(env, body);
      return addSecurityHeaders(new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } }));
    } catch (error) {
      return addSecurityHeaders(
        new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      );
    }
  }

  return addSecurityHeaders(new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 }));
}

export async function handleStats(request: Request, env: Env): Promise<Response> {
  if (!verifyAdminAuth(request, env.ADMIN_TOKEN)) {
    return addSecurityHeaders(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
  }

  const storage = createStorage(env);
  const cfg = await getRuntimeConfig(env, request.url);
  let posts: InternalPost[] = [];
  let lastUpdate: string | null = null;

  if (storage) {
    if (env.DB && storage instanceof D1StorageAdapter) {
      try {
        await storage.initSchema();
      } catch {}
    }
    try {
      posts = await storage.getPosts();
      lastUpdate = await storage.getLastUpdate();
    } catch {}
  }

  const res = new Response(
    JSON.stringify({
      status: 'healthy',
      count: posts.length,
      storage: env.KV ? 'kv' : env.DB ? 'd1' : 'none',
      lastUpdate: lastUpdate || new Date().toISOString(),
      providerEndpoint: cfg.providerEndpoint,
      feedTitle: cfg.feedTitle,
      feedDescription: cfg.feedDescription,
      posts
    }),
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );
  return addSecurityHeaders(res);
}

export async function handleHealth(request: Request, env: Env): Promise<Response> {
  const res = new Response(
    JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      storage: env.KV ? 'kv' : env.DB ? 'd1' : 'none'
    }),
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );
  return addSecurityHeaders(res);
}

export async function handleUpdate(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return addSecurityHeaders(new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 }));
  }

  if (!verifyAdminAuth(request, env.ADMIN_TOKEN)) {
    return addSecurityHeaders(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
  }

  const storage = createStorage(env);
  const config = await getRuntimeConfig(env, request.url);

  try {
    const provider = new HttpDataProvider({ endpoint: config.providerEndpoint });
    const posts = await provider.fetchPosts();

    if (posts.length > 0 && storage) {
      await storage.savePosts(posts);
      await storage.setLastUpdate(new Date().toISOString());
    }

    return addSecurityHeaders(
      new Response(JSON.stringify({ success: true, count: posts.length }), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
  } catch (error) {
    return addSecurityHeaders(
      new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    );
  }
}

export async function handleFeed(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const storage = createStorage(env);
  const config = await getRuntimeConfig(env, request.url);

  try {
    let posts: InternalPost[] = [];
    if (storage) {
      if (env.DB && storage instanceof D1StorageAdapter) {
        try {
          await storage.initSchema();
        } catch {}
      }
      posts = await storage.getPosts();
    }

    if (posts.length === 0) {
      posts = [
        {
          id: 'welcome',
          url: url.origin,
          title: 'XRSS Feed Operational',
          content: '<p>XRSS is active and ready to convert posts into RSS 2.0.</p>',
          author: 'XRSS System',
          publishedAt: new Date().toISOString()
        }
      ];
    }

    const feedXml = generateRssFeed(
      {
        title: config.feedTitle,
        link: config.feedLink || url.origin,
        description: config.feedDescription
      },
      posts
    );

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
}
