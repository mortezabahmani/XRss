import { Env } from '../config';
import { handleAdmin, handleHealth, handleUpdate, handleFeed } from './handlers';

export async function routeRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.toLowerCase();

  if (path === '/admin') {
    return handleAdmin(request, env);
  }

  if (path === '/health' || path === '/status') {
    return handleHealth(request, env);
  }

  if (path === '/update') {
    return handleUpdate(request, env);
  }

  // Default route (root `/`, `/feed.xml`, or any other path) -> RSS Feed
  return handleFeed(request, env);
}
