import { Env } from '../config';
import { handleAdmin, handleHealth, handleUpdate, handleFeed, handleStats, handleConfigApi } from './handlers';

export async function routeRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.toLowerCase();

  if (path === '/admin') {
    return handleAdmin(request, env);
  }

  if (path === '/api/stats') {
    return handleStats(request, env);
  }

  if (path === '/api/config') {
    return handleConfigApi(request, env);
  }

  if (path === '/health' || path === '/status') {
    return handleHealth(request, env);
  }

  if (path === '/update') {
    return handleUpdate(request, env);
  }

  return handleFeed(request, env);
}
