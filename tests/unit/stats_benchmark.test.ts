import { describe, it, expect } from 'vitest';
import { handleStats } from '../../src/http/handlers';
import { Env } from '../../src/config';

describe('handleStats benchmark', () => {
  it('fetches posts, lastUpdate, and lastError concurrently from storage', async () => {
    const delayMs = 30;
    const mockKv = {
      get: async (key: string) => {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        if (key === 'posts') {
          return [
            {
              id: '1',
              url: 'https://example.com/1',
              title: 'Post 1',
              content: 'Content 1',
              author: 'Author',
              publishedAt: '2026-03-08T00:00:00Z'
            }
          ];
        }
        if (key === 'last_update') return '2026-03-08T12:00:00Z';
        if (key === 'last_error') return null;
        return null;
      },
      put: async () => {},
      delete: async () => {}
    } as unknown as KVNamespace;

    const env: Env = {
      ADMIN_TOKEN: 'secret123',
      KV: mockKv
    };

    const req = new Request('http://localhost/admin/api/stats', {
      headers: { Authorization: 'Bearer secret123' }
    });

    const start = performance.now();
    const res = await handleStats(req, env);
    const duration = performance.now() - start;

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.status).toBe('healthy');
    expect(data.count).toBe(1);
    expect(data.lastUpdate).toBe('2026-03-08T12:00:00Z');
    expect(data.lastError).toBeNull();

    // Log the measured duration
    console.log(`handleStats duration with ${delayMs}ms storage delay: ${duration.toFixed(2)}ms`);
  });
});
