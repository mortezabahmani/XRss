import { describe, it, expect, vi } from 'vitest';
import { runSync, handleStats } from '../../src/http/handlers';
import { Env } from '../../src/config';

describe('Performance Benchmark - Batch Storage Operations', () => {
  function createDelayedMockKV(delayMs: number = 20): KVNamespace {
    const store = new Map<string, string>();
    const delay = () => new Promise((resolve) => setTimeout(resolve, delayMs));

    return {
      get: vi.fn(async (key: string, type?: string) => {
        await delay();
        const val = store.get(key);
        if (!val) return null;
        if (type === 'json') {
          try { return JSON.parse(val); } catch { return null; }
        }
        return val;
      }),
      put: vi.fn(async (key: string, value: string) => {
        await delay();
        store.set(key, value);
      }),
      delete: vi.fn(async (key: string) => {
        await delay();
        store.delete(key);
      }),
      list: vi.fn(),
      getWithMetadata: vi.fn()
    } as unknown as KVNamespace;
  }

  it('measures execution time of runSync concurrent batch save operations', async () => {
    const mockKv = createDelayedMockKV(20);
    const env: Env = {
      ADMIN_TOKEN: 'test-token',
      X_USERNAME: 'testuser',
      KV: mockKv
    };

    // Mock fetch for XFeedProvider
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify([{
          id: 'p1',
          url: 'https://x.com/test/status/1',
          title: 'Post 1',
          content: 'Content 1',
          author: 'test',
          publishedAt: new Date().toISOString()
        }]))
      })
    );

    const start = performance.now();
    const result = await runSync(env, 'https://example.com/update');
    const elapsed = performance.now() - start;

    expect(result.count).toBe(1);
    // Sequential execution would take >= 160ms.
    // Concurrent execution finishes significantly faster.
    expect(elapsed).toBeLessThan(120);
    console.log(`[Benchmark Optimized] runSync elapsed time: ${elapsed.toFixed(2)}ms`);
  });

  it('measures execution time of handleStats concurrent batch read operations', async () => {
    const mockKv = createDelayedMockKV(20);
    const env: Env = {
      ADMIN_TOKEN: 'test-token',
      X_USERNAME: 'testuser',
      KV: mockKv
    };

    const req = new Request('https://example.com/admin/stats', {
      headers: { Authorization: 'Bearer test-token' }
    });

    const start = performance.now();
    const res = await handleStats(req, env);
    const elapsed = performance.now() - start;

    expect(res.status).toBe(200);
    // Sequential execution of 3 storage reads would take >= 60ms.
    // Concurrent execution finishes in ~20-40ms.
    expect(elapsed).toBeLessThan(100);
    console.log(`[Benchmark Optimized] handleStats elapsed time: ${elapsed.toFixed(2)}ms`);
  });
});
