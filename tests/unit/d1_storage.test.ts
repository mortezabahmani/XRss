import { describe, it, expect, beforeEach } from 'vitest';
import { D1StorageAdapter } from '../../src/storage/d1_storage';
import { InternalPost } from '../../src/core/types';

class MockD1Database {
  posts = new Map<string, any>();
  metadata = new Map<string, string>();
  executedQueries: Array<{ sql: string; args: any[] }> = [];

  prepare(sql: string) {
    const db = this;
    const stmt = {
      _sql: sql,
      _boundArgs: [] as any[],
      bind(...args: any[]) {
        const newStmt = db.prepare(sql);
        (newStmt as any)._boundArgs = args;
        return newStmt;
      },
      async run() {
        db.executedQueries.push({ sql: this._sql, args: this._boundArgs });
        if (this._sql.includes('DELETE FROM metadata')) {
          const key = this._boundArgs[0];
          db.metadata.delete(key);
        } else if (this._sql.includes('INSERT OR REPLACE INTO metadata')) {
          const [key, value] = this._boundArgs;
          db.metadata.set(key, value);
        }
        return { success: true, meta: {} };
      },
      async all() {
        db.executedQueries.push({ sql: this._sql, args: this._boundArgs });
        if (this._sql.includes('FROM posts')) {
          const results = Array.from(db.posts.values()).sort((a, b) =>
            b.publishedAt.localeCompare(a.publishedAt)
          );
          return { results, success: true, meta: {} };
        }
        return { results: [], success: true, meta: {} };
      },
      async first() {
        db.executedQueries.push({ sql: this._sql, args: this._boundArgs });
        if (this._sql.includes('FROM metadata')) {
          const key = this._boundArgs[0];
          const value = db.metadata.get(key);
          return value !== undefined ? { value } : null;
        }
        return null;
      }
    };
    return stmt;
  }

  async batch(statements: any[]) {
    for (const stmt of statements) {
      this.executedQueries.push({ sql: stmt._sql, args: stmt._boundArgs });
      const [id, url, title, content, author, publishedAt, mediaUrls] = stmt._boundArgs;
      this.posts.set(id, { id, url, title, content, author, publishedAt, mediaUrls });
    }
    return [];
  }
}

describe('D1StorageAdapter', () => {
  let mockDb: MockD1Database;
  let adapter: D1StorageAdapter;

  beforeEach(() => {
    mockDb = new MockD1Database();
    adapter = new D1StorageAdapter(mockDb as unknown as D1Database);
  });

  it('initializes schema without error', async () => {
    await adapter.initSchema();
    expect(mockDb.executedQueries.length).toBe(2);
    expect(mockDb.executedQueries[0].sql).toContain('CREATE TABLE IF NOT EXISTS posts');
    expect(mockDb.executedQueries[1].sql).toContain('CREATE TABLE IF NOT EXISTS metadata');
  });

  it('saves posts and retrieves them ordered by publishedAt', async () => {
    const posts: InternalPost[] = [
      {
        id: 'post-1',
        url: 'https://example.com/1',
        title: 'First Post',
        content: 'Content 1',
        author: 'Alice',
        publishedAt: '2026-03-01T10:00:00Z',
        mediaUrls: ['https://example.com/img1.png']
      },
      {
        id: 'post-2',
        url: 'https://example.com/2',
        title: 'Second Post',
        content: 'Content 2',
        author: 'Bob',
        publishedAt: '2026-03-02T10:00:00Z'
      }
    ];

    await adapter.savePosts(posts);
    const retrieved = await adapter.getPosts();

    expect(retrieved).toHaveLength(2);
    // Should be sorted by publishedAt DESC (post-2 first)
    expect(retrieved[0].id).toBe('post-2');
    expect(retrieved[0].mediaUrls).toEqual([]);
    expect(retrieved[1].id).toBe('post-1');
    expect(retrieved[1].mediaUrls).toEqual(['https://example.com/img1.png']);
  });

  it('handles empty posts array when saving', async () => {
    await adapter.savePosts([]);
    const retrieved = await adapter.getPosts();
    expect(retrieved).toEqual([]);
  });

  it('manages last update timestamp', async () => {
    expect(await adapter.getLastUpdate()).toBeNull();

    const timestamp = '2026-03-08T12:00:00Z';
    await adapter.setLastUpdate(timestamp);

    expect(await adapter.getLastUpdate()).toBe(timestamp);
  });

  it('manages last error string including clear (set null)', async () => {
    expect(await adapter.getLastError()).toBeNull();

    const errorMsg = 'Failed to fetch upstream';
    await adapter.setLastError(errorMsg);
    expect(await adapter.getLastError()).toBe(errorMsg);

    await adapter.setLastError(null);
    expect(await adapter.getLastError()).toBeNull();
  });
});
