import { describe, it, expect, vi, beforeEach } from 'vitest';
import { D1StorageAdapter } from '../../src/storage/d1_storage';
import { InternalPost } from '../../src/core/types';

describe('D1StorageAdapter', () => {
  let mockDb: any;
  let mockStmt: any;
  let mockBoundStmt: any;
  let adapter: D1StorageAdapter;

  beforeEach(() => {
    mockBoundStmt = {
      run: vi.fn().mockResolvedValue({ success: true }),
      all: vi.fn().mockResolvedValue({ results: [] }),
      first: vi.fn().mockResolvedValue(null)
    };

    mockStmt = {
      bind: vi.fn().mockReturnValue(mockBoundStmt),
      run: vi.fn().mockResolvedValue({ success: true }),
      all: vi.fn().mockResolvedValue({ results: [] }),
      first: vi.fn().mockResolvedValue(null)
    };

    mockDb = {
      prepare: vi.fn().mockReturnValue(mockStmt),
      batch: vi.fn().mockResolvedValue([])
    };

    adapter = new D1StorageAdapter(mockDb as unknown as D1Database);
  });

  describe('savePosts', () => {
    it('prepares insert query, binds parameters correctly, and calls batch execution', async () => {
      const samplePosts: InternalPost[] = [
        {
          id: 'post-1',
          url: 'https://x.com/user/status/1',
          title: 'First Post',
          content: '<p>First content</p>',
          author: 'Alice',
          publishedAt: '2026-03-08T10:00:00Z',
          mediaUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
        },
        {
          id: 'post-2',
          url: 'https://x.com/user/status/2',
          title: 'Second Post',
          content: '<p>Second content</p>',
          author: 'Bob',
          publishedAt: '2026-03-08T11:00:00Z'
        }
      ];

      await adapter.savePosts(samplePosts);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO posts')
      );

      expect(mockStmt.bind).toHaveBeenCalledTimes(2);
      expect(mockStmt.bind).toHaveBeenNthCalledWith(
        1,
        'post-1',
        'https://x.com/user/status/1',
        'First Post',
        '<p>First content</p>',
        'Alice',
        '2026-03-08T10:00:00Z',
        JSON.stringify(['https://example.com/image1.jpg', 'https://example.com/image2.jpg'])
      );

      expect(mockStmt.bind).toHaveBeenNthCalledWith(
        2,
        'post-2',
        'https://x.com/user/status/2',
        'Second Post',
        '<p>Second content</p>',
        'Bob',
        '2026-03-08T11:00:00Z',
        JSON.stringify([])
      );

      expect(mockDb.batch).toHaveBeenCalledTimes(1);
      expect(mockDb.batch).toHaveBeenCalledWith([mockBoundStmt, mockBoundStmt]);
    });

    it('does not invoke db.batch when posts array is empty', async () => {
      await adapter.savePosts([]);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO posts')
      );
      expect(mockStmt.bind).not.toHaveBeenCalled();
      expect(mockDb.batch).not.toHaveBeenCalled();
    });

    it('handles posts with undefined or empty mediaUrls by serializing to "[]"', async () => {
      const postWithoutMedia: InternalPost = {
        id: 'post-3',
        url: 'https://x.com/user/status/3',
        title: 'No Media',
        content: 'Content',
        author: 'Charlie',
        publishedAt: '2026-03-08T12:00:00Z'
      };

      await adapter.savePosts([postWithoutMedia]);

      expect(mockStmt.bind).toHaveBeenCalledWith(
        'post-3',
        'https://x.com/user/status/3',
        'No Media',
        'Content',
        'Charlie',
        '2026-03-08T12:00:00Z',
        '[]'
      );
      expect(mockDb.batch).toHaveBeenCalledTimes(1);
    });
  });

  describe('initSchema', () => {
    it('prepares and runs schema creation queries for posts and metadata tables', async () => {
      await adapter.initSchema();

      expect(mockDb.prepare).toHaveBeenCalledTimes(2);
      expect(mockDb.prepare).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('CREATE TABLE IF NOT EXISTS posts')
      );
      expect(mockDb.prepare).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('CREATE TABLE IF NOT EXISTS metadata')
      );
      expect(mockStmt.run).toHaveBeenCalledTimes(2);
    });
  });

  describe('getPosts', () => {
    it('queries stored posts ordered by publishedAt DESC and parses JSON mediaUrls', async () => {
      const rawRows = [
        {
          id: 'post-1',
          url: 'https://x.com/user/status/1',
          title: 'Post 1',
          content: 'Content 1',
          author: 'Alice',
          publishedAt: '2026-03-08T10:00:00Z',
          mediaUrls: JSON.stringify(['https://example.com/img.png'])
        },
        {
          id: 'post-2',
          url: 'https://x.com/user/status/2',
          title: 'Post 2',
          content: 'Content 2',
          author: 'Bob',
          publishedAt: '2026-03-08T09:00:00Z',
          mediaUrls: null
        }
      ];

      mockStmt.all.mockResolvedValueOnce({ results: rawRows });

      const posts = await adapter.getPosts();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM posts ORDER BY publishedAt DESC LIMIT 100'
      );
      expect(posts).toEqual([
        {
          id: 'post-1',
          url: 'https://x.com/user/status/1',
          title: 'Post 1',
          content: 'Content 1',
          author: 'Alice',
          publishedAt: '2026-03-08T10:00:00Z',
          mediaUrls: ['https://example.com/img.png']
        },
        {
          id: 'post-2',
          url: 'https://x.com/user/status/2',
          title: 'Post 2',
          content: 'Content 2',
          author: 'Bob',
          publishedAt: '2026-03-08T09:00:00Z',
          mediaUrls: []
        }
      ]);
    });

    it('returns empty array when results are null or undefined', async () => {
      mockStmt.all.mockResolvedValueOnce({ results: undefined });

      const posts = await adapter.getPosts();

      expect(posts).toEqual([]);
    });
  });

  describe('metadata methods', () => {
    it('getLastUpdate retrieves timestamp from metadata', async () => {
      mockBoundStmt.first.mockResolvedValueOnce({ value: '2026-03-08T12:00:00Z' });

      const lastUpdate = await adapter.getLastUpdate();

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT value FROM metadata WHERE key = ?');
      expect(mockStmt.bind).toHaveBeenCalledWith('last_update');
      expect(lastUpdate).toBe('2026-03-08T12:00:00Z');
    });

    it('getLastUpdate returns null when no value exists', async () => {
      mockBoundStmt.first.mockResolvedValueOnce(null);

      const lastUpdate = await adapter.getLastUpdate();

      expect(lastUpdate).toBeNull();
    });

    it('setLastUpdate saves timestamp into metadata', async () => {
      const timestamp = '2026-03-08T12:30:00Z';
      await adapter.setLastUpdate(timestamp);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)'
      );
      expect(mockStmt.bind).toHaveBeenCalledWith('last_update', timestamp);
      expect(mockBoundStmt.run).toHaveBeenCalled();
    });

    it('getLastError retrieves last error message', async () => {
      mockBoundStmt.first.mockResolvedValueOnce({ value: 'Network failure' });

      const lastError = await adapter.getLastError();

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT value FROM metadata WHERE key = ?');
      expect(mockStmt.bind).toHaveBeenCalledWith('last_error');
      expect(lastError).toBe('Network failure');
    });

    it('setLastError deletes key when error is null', async () => {
      await adapter.setLastError(null);

      expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM metadata WHERE key = ?');
      expect(mockStmt.bind).toHaveBeenCalledWith('last_error');
      expect(mockBoundStmt.run).toHaveBeenCalled();
    });

    it('setLastError inserts error message when non-null', async () => {
      await adapter.setLastError('DB Connection Lost');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)'
      );
      expect(mockStmt.bind).toHaveBeenCalledWith('last_error', 'DB Connection Lost');
      expect(mockBoundStmt.run).toHaveBeenCalled();
    });
  });
});
