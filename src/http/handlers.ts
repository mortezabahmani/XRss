import { Env, getRuntimeConfig, saveRuntimeConfig } from '../config';
import { createStorage, D1StorageAdapter } from '../storage';
import { XFeedProvider } from '../providers/x_provider';
import { generateRssFeed } from '../rss/generator';
import { addSecurityHeaders, verifyAdminAuth, createSessionCookieHeader, createClearSessionCookieHeader } from '../security/middleware';
import { renderAdminDashboardView, renderAdminLoginView } from '../ui/admin';
import { InternalPost } from '../core/types';

// ---------- AUTH ----------

export async function handleAdminLogin(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return addSecurityHeaders(new Response('Method not allowed', { status: 405 }));
  }

  let token = '';
  const ct = request.headers.get('Content-Type') || '';
  if (ct.includes('application/json')) {
    try {
      const body = (await request.json()) as { token?: string };
      token = body.token?.trim() || '';
    } catch {}
  } else {
    try {
      const form = await request.formData();
      token = (form.get('token') as string | null)?.trim() || '';
    } catch {}
  }

  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    const res = new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
    return addSecurityHeaders(res);
  }

  const res = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
  const headers = new Headers(res.headers);
  headers.set('Set-Cookie', createSessionCookieHeader(token));
  return addSecurityHeaders(new Response(res.body, { status: res.status, headers }));
}

export async function handleAdminLogout(request: Request, env: Env): Promise<Response> {
  const res = new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
  const headers = new Headers(res.headers);
  headers.set('Set-Cookie', createClearSessionCookieHeader());
  return addSecurityHeaders(new Response(res.body, { status: 200, headers }));
}

// ---------- ADMIN UI ----------

export async function handleAdmin(request: Request, env: Env): Promise<Response> {
  if (!(await verifyAdminAuth(request, env.ADMIN_TOKEN))) {
    const res = new Response(renderAdminLoginView(), {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=UTF-8' }
    });
    return addSecurityHeaders(res);
  }

  const html = renderAdminDashboardView();
  const res = new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=UTF-8' }
  });
  return addSecurityHeaders(res);
}

// ---------- API ----------

export async function handleConfigApi(request: Request, env: Env): Promise<Response> {
  if (!(await verifyAdminAuth(request, env.ADMIN_TOKEN))) {
    return addSecurityHeaders(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
  }

  if (request.method === 'GET') {
    const cfg = await getRuntimeConfig(env, request.url);
    return addSecurityHeaders(
      new Response(
        JSON.stringify({
          xUsername: cfg.xUsername,
          providerEndpoint: cfg.providerEndpoint,
          feedTitle: cfg.feedTitle,
          feedDescription: cfg.feedDescription,
          maxPosts: cfg.maxPosts
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    );
  }

  if (request.method === 'POST') {
    try {
      const body = (await request.json()) as {
        xUsername?: string;
        providerEndpoint?: string;
        feedTitle?: string;
        feedDescription?: string;
        maxPosts?: number;
      };
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
  if (!(await verifyAdminAuth(request, env.ADMIN_TOKEN))) {
    return addSecurityHeaders(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
  }

  const storage = createStorage(env);
  const cfg = await getRuntimeConfig(env, request.url);
  let posts: InternalPost[] = [];
  let lastUpdate: string | null = null;
  let lastError: string | null = null;

  if (storage) {
    if (env.DB && storage instanceof D1StorageAdapter) {
      try { await storage.initSchema(); } catch {}
    }
    try {
      posts = await storage.getPosts();
      lastUpdate = await storage.getLastUpdate();
      lastError = await storage.getLastError();
    } catch {}
  }

  const res = new Response(
    JSON.stringify({
      status: 'healthy',
      count: posts.length,
      storage: env.KV ? 'kv' : env.DB ? 'd1' : 'none',
      lastUpdate,
      lastError,
      xUsername: cfg.xUsername,
      providerEndpoint: cfg.providerEndpoint,
      feedTitle: cfg.feedTitle,
      feedDescription: cfg.feedDescription,
      maxPosts: cfg.maxPosts,
      posts
    }),
    { headers: { 'Content-Type': 'application/json' } }
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
    { headers: { 'Content-Type': 'application/json' } }
  );
  return addSecurityHeaders(res);
}

// ---------- UPDATE (SYNC) ----------

export async function runSync(env: Env, requestUrl?: string): Promise<{ count: number }> {
  const storage = createStorage(env);
  const cfg = await getRuntimeConfig(env, requestUrl);

  const provider = new XFeedProvider({
    username: cfg.xUsername,
    endpoint: cfg.providerEndpoint
  });

  const posts = await provider.fetchPosts();

  if (storage && posts.length > 0) {
    if (env.DB && storage instanceof D1StorageAdapter) {
      try { await storage.initSchema(); } catch {}
    }
    await storage.savePosts(posts);
    await storage.setLastUpdate(new Date().toISOString());
    await storage.setLastError(null);
  }

  return { count: posts.length };
}

export async function handleUpdate(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return addSecurityHeaders(new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 }));
  }

  if (!(await verifyAdminAuth(request, env.ADMIN_TOKEN))) {
    return addSecurityHeaders(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
  }

  try {
    const { count } = await runSync(env, request.url);
    return addSecurityHeaders(
      new Response(JSON.stringify({ success: true, count }), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
  } catch (error) {
    const errMsg = (error as Error).message;
    // Record last error, preserve existing feed
    const storage = createStorage(env);
    if (storage) {
      try { await storage.setLastError(errMsg); } catch {}
    }
    return addSecurityHeaders(
      new Response(JSON.stringify({ success: false, error: errMsg }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    );
  }
}

// ---------- FEED ----------

export async function handleFeed(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const storage = createStorage(env);
  const cfg = await getRuntimeConfig(env, request.url);

  try {
    let posts: InternalPost[] = [];
    if (storage) {
      if (env.DB && storage instanceof D1StorageAdapter) {
        try { await storage.initSchema(); } catch {}
      }
      posts = await storage.getPosts();
    }

    if (posts.length === 0) {
      posts = [{
        id: 'welcome',
        url: url.origin,
        title: cfg.feedTitle,
        content: cfg.xUsername
          ? `<p>XRSS is configured. Set up the cron or hit <code>POST /update</code> (with Bearer token) to fetch posts from @${cfg.xUsername}.</p>`
          : '<p>XRSS is active. Configure X_USERNAME and ADMIN_TOKEN, then sync.</p>',
        author: 'XRSS System',
        publishedAt: new Date().toISOString()
      }];
    }

    const feedXml = generateRssFeed(
      {
        title: cfg.feedTitle,
        link: cfg.feedLink || url.origin,
        description: cfg.feedDescription
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
