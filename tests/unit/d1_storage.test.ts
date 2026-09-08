import { describe, it, expect, vi } from 'vitest';
import { D1StorageAdapter } from '../../src/storage/d1_storage';
import { InternalPost } from '../../src/core/types';

function createMockD1Database() {
  const preparedStatements: any[] = [];
  const batches: any[] = [];

  const createPreparedStatement = (query: string) => {
    let boundArgs: any[] = [];
    const stmt = {
      query,
      get boundArgs() {
        return boundArgs;
      },
      bind(...args: any[]) {
        boundArgs = args;
        return stmt;
      },
      async run() {
        return { success: true };
      },
      async all() {
        if (query.includes('FROM posts')) {
          return {
            results: [
              {
                id: '1',
                url: 'https://example.com/1',
                title: 'Test Post 1',
                content: 'Content 1',
                author: 'Author 1',
                publishedAt: '2026-03-08T10:00:00Z',
                mediaUrls: JSON.stringify(['https://example.com/img1.jpg'])
              },
              {
                id: '2',
                url: 'https://example.com/2',
                title: 'Test Post 2',
                content: 'Content 2',
                author: 'Author 2',
                publishedAt: '2026-03-08T09:00:00Z',
                mediaUrls: null
              }
            ]
          };
        }
        return { results: [] };
      },
      async first() {
        if (query.includes('FROM metadata')) {
          if (boundArgs[0] === 'last_update') {
            return { value: '2026-03-08T12:00:00Z' };
          }
          if (boundArgs[0] === 'last_error') {
            return { value: 'Fetch failed' };
          }
        }
        return null;
      }
    };
    preparedStatements.push(stmt);
    return stmt;
  };

  const db = {
    preparedStatements,
    batches,
    prepare(query: string) {
      return createPreparedStatement(query);
    },
    async batch(stmts: any[]) {
      batches.push(stmts);
      return [];
    }
  } as unknown as D1Database & { preparedStatements: any[]; batches: any[] };

  return db;
}

describe('D1StorageAdapter', () => {
  it('initializes schema correctly', async () => {
    const mockDb = createMockD1Database();
    const adapter = new D1StorageAdapter(mockDb);

    await adapter.initSchema();
    expect(mockDb.preparedStatements.length).toBe(2);
    expect(mockDb.preparedStatements[0].query).toContain('CREATE TABLE IF NOT EXISTS posts');
    expect(mockDb.preparedStatements[1].query).toContain('CREATE TABLE IF NOT EXISTS metadata');
  });

  it('retrieves and parses posts correctly without any type errors', async () => {
    const mockDb = createMockD1Database();
    const adapter = new D1StorageAdapter(mockDb);

    const posts = await adapter.getPosts();
    expect(posts).toHaveLength(2);
    expect(posts[0]).toEqual({
      id: '1',
      url: 'https://example.com/1',
      title: 'Test Post 1',
      content: 'Content 1',
      author: 'Author 1',
      publishedAt: '2026-03-08T10:00:00Z',
      mediaUrls: ['https://example.com/img1.jpg']
    });
    expect(posts[1]).toEqual({
      id: '2',
      url: 'https://example.com/2',
      title: 'Test Post 2',
      content: 'Content 2',
      author: 'Author 2',
      publishedAt: '2026-03-08T09:00:00Z',
      mediaUrls: []
    });
  });

  it('saves posts using batch statement', async () => {
    const mockDb = createMockD1Database();
    const adapter = new D1StorageAdapter(mockDb);

    const postsToSave: InternalPost[] = [
      {
        id: '10',
        url: 'https://example.com/10',
        title: 'New Post',
        content: 'New content',
        author: 'Author',
        publishedAt: '2026-03-08T11:00:00Z',
        mediaUrls: ['https://example.com/media.jpg']
      }
    ];

    await adapter.savePosts(postsToSave);
    expect(mockDb.batches).toHaveLength(1);
    expect(mockDb.batches[0]).toHaveLength(1);
    expect(mockDb.batches[0][0].boundArgs).toEqual([
      '10',
      'https://example.com/10',
      'New Post',
      'New content',
      'Author',
      '2026-03-08T11:00:00Z',
      JSON.stringify(['https://example.com/media.jpg'])
    ]);
  });

  it('gets and sets last update timestamp', async () => {
    const mockDb = createMockD1Database();
    const adapter = new D1StorageAdapter(mockDb);

    const lastUpdate = await adapter.getLastUpdate();
    expect(lastUpdate).toBe('2026-03-08T12:00:00Z');

    await adapter.setLastUpdate('2026-03-08T13:00:00Z');
    const lastStmt = mockDb.preparedStatements[mockDb.preparedStatements.length - 1];
    expect(lastStmt.query).toContain('INSERT OR REPLACE INTO metadata');
    expect(lastStmt.boundArgs).toEqual(['last_update', '2026-03-08T13:00:00Z']);
  });

  it('gets and sets last error', async () => {
    const mockDb = createMockD1Database();
    const adapter = new D1StorageAdapter(mockDb);

    const lastError = await adapter.getLastError();
    expect(lastError).toBe('Fetch failed');

    await adapter.setLastError('New error');
    let lastStmt = mockDb.preparedStatements[mockDb.preparedStatements.length - 1];
    expect(lastStmt.query).toContain('INSERT OR REPLACE INTO metadata');
    expect(lastStmt.boundArgs).toEqual(['last_error', 'New error']);

    await adapter.setLastError(null);
    lastStmt = mockDb.preparedStatements[mockDb.preparedStatements.length - 1];
    expect(lastStmt.query).toContain('DELETE FROM metadata');
    expect(lastStmt.boundArgs).toEqual(['last_error']);
  });
});
