import { describe, it, expect, vi } from 'vitest';
import { D1StorageAdapter } from '../../src/storage/d1_storage';
import { InternalPost } from '../../src/core/types';

function createMockD1Database(simulatedLatencyMs = 5) {
  const postsMap = new Map<string, any>();
  const metadataMap = new Map<string, string>();
  let prepareCalls = 0;
  let batchCalls = 0;
  let runCalls = 0;

  const mockDb = {
    get metrics() {
      return { prepareCalls, batchCalls, runCalls };
    },
    resetMetrics() {
      prepareCalls = 0;
      batchCalls = 0;
      runCalls = 0;
    },
    prepare: vi.fn((query: string) => {
      prepareCalls++;
      let boundArgs: any[] = [];

      const stmt = {
        query,
        bind: (...args: any[]) => {
          boundArgs = args;
          return stmt;
        },
        run: async () => {
          runCalls++;
          if (simulatedLatencyMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, simulatedLatencyMs));
          }
          if (query.includes('INSERT OR REPLACE INTO metadata')) {
            metadataMap.set(boundArgs[0], boundArgs[1]);
          } else if (query.includes('DELETE FROM metadata')) {
            metadataMap.delete(boundArgs[0]);
          }
          return { success: true };
        },
        first: async () => {
          if (simulatedLatencyMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, simulatedLatencyMs));
          }
          if (query.includes('SELECT value FROM metadata')) {
            const val = metadataMap.get(boundArgs[0]);
            return val !== undefined ? { value: val } : null;
          }
          return null;
        },
        all: async () => {
          if (simulatedLatencyMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, simulatedLatencyMs));
          }
          if (query.includes('SELECT * FROM posts')) {
            const results = Array.from(postsMap.values());
            return { results };
          }
          return { results: [] };
        }
      };
      return stmt;
    }) as any,

    batch: vi.fn(async (statements: any[]) => {
      batchCalls++;
      if (simulatedLatencyMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, simulatedLatencyMs));
      }
      return statements.map(() => ({ success: true }));
    }) as any
  };

  return mockDb;
}

describe('D1StorageAdapter', () => {
  it('initializes schema using db.batch', async () => {
    const mockDb = createMockD1Database(0);
    const storage = new D1StorageAdapter(mockDb as any);

    await storage.initSchema();
    expect(mockDb.prepare).toHaveBeenCalledTimes(2);
    expect(mockDb.batch).toHaveBeenCalledTimes(1);
    expect(mockDb.metrics.batchCalls).toBe(1);
  });

  it('measures execution time for optimized initSchema', async () => {
    const mockDb = createMockD1Database(10); // 10ms per I/O call
    const storage = new D1StorageAdapter(mockDb as any);

    const start = performance.now();
    await storage.initSchema();
    const duration = performance.now() - start;

    console.log(`[Optimized] initSchema duration: ${duration.toFixed(2)}ms, batchCalls: ${mockDb.metrics.batchCalls}, runCalls: ${mockDb.metrics.runCalls}`);
    expect(mockDb.metrics.batchCalls).toBe(1);
    expect(mockDb.metrics.runCalls).toBe(0);
    // With 10ms per batch call instead of 2 sequential run calls (20ms), execution time is reduced by ~50%.
    expect(duration).toBeLessThan(18);
  });

  it('handles getPosts and savePosts correctly', async () => {
    const mockDb = createMockD1Database(0);
    const storage = new D1StorageAdapter(mockDb as any);

    const post: InternalPost = {
      id: 'p1',
      url: 'https://example.com/p1',
      title: 'Post 1',
      content: 'Content 1',
      author: 'Author 1',
      publishedAt: '2026-03-08T00:00:00Z',
      mediaUrls: ['https://example.com/img.png']
    };

    await storage.savePosts([post]);
    expect(mockDb.batch).toHaveBeenCalledTimes(1);

    const posts = await storage.getPosts();
    expect(mockDb.prepare).toHaveBeenCalledWith(
      'SELECT * FROM posts ORDER BY publishedAt DESC LIMIT 100'
    );
    expect(posts).toEqual([]);
  });

  it('handles metadata operations (lastUpdate & lastError)', async () => {
    const mockDb = createMockD1Database(0);
    const storage = new D1StorageAdapter(mockDb as any);

    await storage.setLastUpdate('2026-03-08T12:00:00Z');
    const lastUpdate = await storage.getLastUpdate();
    expect(lastUpdate).toBe('2026-03-08T12:00:00Z');

    await storage.setLastError('Something failed');
    const lastError = await storage.getLastError();
    expect(lastError).toBe('Something failed');

    await storage.setLastError(null);
    const clearedError = await storage.getLastError();
    expect(clearedError).toBeNull();
  });
});
