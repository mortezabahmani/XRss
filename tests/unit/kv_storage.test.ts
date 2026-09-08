import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KVStorageAdapter } from '../../src/storage/kv_storage';
import { InternalPost } from '../../src/core/types';

describe('KVStorageAdapter', () => {
  let mockKv: {
    get: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
    getWithMetadata: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockKv = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      getWithMetadata: vi.fn(),
    };
  });

  describe('getPosts', () => {
    it('returns an empty array when kv.get throws an error', async () => {
      mockKv.get.mockRejectedValue(new Error('KV get failed'));
      const storage = new KVStorageAdapter(mockKv as unknown as KVNamespace);

      const posts = await storage.getPosts();

      expect(posts).toEqual([]);
      expect(mockKv.get).toHaveBeenCalledWith('posts', 'json');
    });

    it('returns parsed posts when valid array is returned by kv.get', async () => {
      const samplePosts: InternalPost[] = [
        {
          id: '1',
          url: 'https://x.com/user/status/1',
          title: 'Post 1',
          content: 'Content 1',
          author: 'User',
          publishedAt: '2026-03-08T10:00:00Z',
        },
      ];
      mockKv.get.mockResolvedValue(samplePosts);
      const storage = new KVStorageAdapter(mockKv as unknown as KVNamespace);

      const posts = await storage.getPosts();

      expect(posts).toEqual(samplePosts);
      expect(mockKv.get).toHaveBeenCalledWith('posts', 'json');
    });

    it('returns an empty array when raw data from KV is not an array', async () => {
      mockKv.get.mockResolvedValue({ notAnArray: true });
      const storage = new KVStorageAdapter(mockKv as unknown as KVNamespace);

      const posts = await storage.getPosts();

      expect(posts).toEqual([]);
    });
  });

  describe('savePosts', () => {
    it('merges new posts with existing posts, sorts by date desc, and saves to KV', async () => {
      const existingPosts: InternalPost[] = [
        {
          id: '1',
          url: 'https://x.com/user/status/1',
          title: 'Old Post',
          content: 'Old Content',
          author: 'User',
          publishedAt: '2026-03-08T08:00:00Z',
        },
      ];
      const newPosts: InternalPost[] = [
        {
          id: '2',
          url: 'https://x.com/user/status/2',
          title: 'New Post',
          content: 'New Content',
          author: 'User',
          publishedAt: '2026-03-08T12:00:00Z',
        },
      ];

      mockKv.get.mockResolvedValue(existingPosts);
      mockKv.put.mockResolvedValue(undefined);
      const storage = new KVStorageAdapter(mockKv as unknown as KVNamespace);

      await storage.savePosts(newPosts);

      expect(mockKv.put).toHaveBeenCalledWith(
        'posts',
        JSON.stringify([newPosts[0], existingPosts[0]])
      );
    });
  });

  describe('getLastUpdate / setLastUpdate', () => {
    it('returns timestamp when getLastUpdate succeeds', async () => {
      mockKv.get.mockResolvedValue('2026-03-08T12:00:00Z');
      const storage = new KVStorageAdapter(mockKv as unknown as KVNamespace);

      const lastUpdate = await storage.getLastUpdate();

      expect(lastUpdate).toBe('2026-03-08T12:00:00Z');
      expect(mockKv.get).toHaveBeenCalledWith('last_update');
    });

    it('returns null when getLastUpdate throws', async () => {
      mockKv.get.mockRejectedValue(new Error('KV error'));
      const storage = new KVStorageAdapter(mockKv as unknown as KVNamespace);

      const lastUpdate = await storage.getLastUpdate();

      expect(lastUpdate).toBeNull();
    });

    it('calls kv.put when setLastUpdate is called', async () => {
      mockKv.put.mockResolvedValue(undefined);
      const storage = new KVStorageAdapter(mockKv as unknown as KVNamespace);

      await storage.setLastUpdate('2026-03-08T12:00:00Z');

      expect(mockKv.put).toHaveBeenCalledWith('last_update', '2026-03-08T12:00:00Z');
    });
  });

  describe('getLastError / setLastError', () => {
    it('returns last error string when getLastError succeeds', async () => {
      mockKv.get.mockResolvedValue('Network error');
      const storage = new KVStorageAdapter(mockKv as unknown as KVNamespace);

      const error = await storage.getLastError();

      expect(error).toBe('Network error');
      expect(mockKv.get).toHaveBeenCalledWith('last_error');
    });

    it('returns null when getLastError throws', async () => {
      mockKv.get.mockRejectedValue(new Error('KV error'));
      const storage = new KVStorageAdapter(mockKv as unknown as KVNamespace);

      const error = await storage.getLastError();

      expect(error).toBeNull();
    });

    it('deletes last_error key when setLastError is called with null', async () => {
      mockKv.delete.mockResolvedValue(undefined);
      const storage = new KVStorageAdapter(mockKv as unknown as KVNamespace);

      await storage.setLastError(null);

      expect(mockKv.delete).toHaveBeenCalledWith('last_error');
    });

    it('puts last_error value when setLastError is called with an error message', async () => {
      mockKv.put.mockResolvedValue(undefined);
      const storage = new KVStorageAdapter(mockKv as unknown as KVNamespace);

      await storage.setLastError('Something went wrong');

      expect(mockKv.put).toHaveBeenCalledWith('last_error', 'Something went wrong');
    });
  });
});
