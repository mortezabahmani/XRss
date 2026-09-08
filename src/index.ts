import { Env } from './config';
import { routeRequest } from './http/router';
import { runSync } from './http/handlers';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return routeRequest(request, env);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      await runSync(env);
    } catch (error) {
      console.error('Scheduled cron update failed:', error);
      // Preserves last known-good feed per ADR-007
    }
  }
};
