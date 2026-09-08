import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KVStorageAdapter } from '../../src/storage/kv_storage';
import { InternalPost } from '../../src/core/types';

describe('KVStorageAdapter', () => {
  let mockKv: {
    get: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let adapter: KVStorageAdapter;

  beforeEach(() => {
    mockKv = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    adapter = new KVStorageAdapter(mockKv as unknown as KVNamespace);
  });

  describe('getPosts', () => {
    it('returns stored posts array when KV contains valid json array', async () => {
      const posts: InternalPost[] = [
        {
          id: '1',
          url: 'https://example.com/1',
          title: 'Title 1',
          content: 'Content 1',
          author: 'Author 1',
          publishedAt: '2026-03-08T00:00:00Z',
        },
      ];
      mockKv.get.mockResolvedValue(posts);

      const result = await adapter.getPosts();

      expect(mockKv.get).toHaveBeenCalledWith('posts', 'json');
      expect(result).toEqual(posts);
    });

    it('returns empty array when KV contains non-array data', async () => {
      mockKv.get.mockResolvedValue({ notAnArray: true });

      const result = await adapter.getPosts();

      expect(result).toEqual([]);
    });

    it('returns empty array when KV returns null', async () => {
      mockKv.get.mockResolvedValue(null);

      const result = await adapter.getPosts();

      expect(result).toEqual([]);
    });

    it('returns empty array when kv.get throws an error', async () => {
      mockKv.get.mockRejectedValue(new Error('KV connection error'));

      const result = await adapter.getPosts();

      expect(result).toEqual([]);
    });
  });

  describe('savePosts', () => {
    it('merges new posts with existing ones, sorts by publishedAt desc, and keeps top 100', async () => {
      const existing: InternalPost[] = [
        {
          id: '1',
          url: 'https://example.com/1',
          title: 'Old Post',
          content: 'Old',
          author: 'Author',
          publishedAt: '2026-01-01T00:00:00Z',
        },
      ];
      mockKv.get.mockResolvedValue(existing);

      const newPosts: InternalPost[] = [
        {
          id: '2',
          url: 'https://example.com/2',
          title: 'Newer Post',
          content: 'Newer',
          author: 'Author',
          publishedAt: '2026-02-01T00:00:00Z',
        },
        {
          id: '1',
          url: 'https://example.com/1',
          title: 'Updated Old Post',
          content: 'Updated',
          author: 'Author',
          publishedAt: '2026-01-01T00:00:00Z',
        },
      ];

      await adapter.savePosts(newPosts);

      expect(mockKv.put).toHaveBeenCalledWith(
        'posts',
        JSON.stringify([
          {
            id: '2',
            url: 'https://example.com/2',
            title: 'Newer Post',
            content: 'Newer',
            author: 'Author',
            publishedAt: '2026-02-01T00:00:00Z',
          },
          {
            id: '1',
            url: 'https://example.com/1',
            title: 'Updated Old Post',
            content: 'Updated',
            author: 'Author',
            publishedAt: '2026-01-01T00:00:00Z',
          },
        ])
      );
    });
  });

  describe('getLastUpdate', () => {
    it('returns timestamp when kv returns string', async () => {
      mockKv.get.mockResolvedValue('2026-03-08T12:00:00Z');

      const result = await adapter.getLastUpdate();

      expect(mockKv.get).toHaveBeenCalledWith('last_update');
      expect(result).toBe('2026-03-08T12:00:00Z');
    });

    it('returns null when kv.get throws an error', async () => {
      mockKv.get.mockRejectedValue(new Error('KV failure'));

      const result = await adapter.getLastUpdate();

      expect(result).toBeNull();
    });
  });

  describe('setLastUpdate', () => {
    it('stores timestamp in KV', async () => {
      await adapter.setLastUpdate('2026-03-08T12:00:00Z');

      expect(mockKv.put).toHaveBeenCalledWith('last_update', '2026-03-08T12:00:00Z');
    });
  });

  describe('getLastError', () => {
    it('returns last error string from KV', async () => {
      mockKv.get.mockResolvedValue('Some error');

      const result = await adapter.getLastError();

      expect(mockKv.get).toHaveBeenCalledWith('last_error');
      expect(result).toBe('Some error');
    });

    it('returns null when kv.get throws an error', async () => {
      mockKv.get.mockRejectedValue(new Error('KV failure'));

      const result = await adapter.getLastError();

      expect(result).toBeNull();
    });
  });

  describe('setLastError', () => {
    it('deletes last_error from KV when error is null', async () => {
      await adapter.setLastError(null);

      expect(mockKv.delete).toHaveBeenCalledWith('last_error');
    });

    it('puts error string into KV when error is non-null', async () => {
      await adapter.setLastError('Something went wrong');

      expect(mockKv.put).toHaveBeenCalledWith('last_error', 'Something went wrong');
    });
  });
});
