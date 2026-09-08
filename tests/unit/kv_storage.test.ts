import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KVStorageAdapter } from '../../src/storage/kv_storage';
import { InternalPost } from '../../src/core/types';

describe('KVStorageAdapter', () => {
  let mockKv: any;
  let adapter: KVStorageAdapter;

  const samplePost1: InternalPost = {
    id: 'post-1',
    url: 'https://example.com/1',
    title: 'Post One',
    content: 'Content 1',
    author: 'Author A',
    publishedAt: '2026-03-01T10:00:00.000Z',
  };

  const samplePost2: InternalPost = {
    id: 'post-2',
    url: 'https://example.com/2',
    title: 'Post Two',
    content: 'Content 2',
    author: 'Author B',
    publishedAt: '2026-03-02T10:00:00.000Z',
  };

  beforeEach(() => {
    mockKv = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    adapter = new KVStorageAdapter(mockKv as unknown as KVNamespace);
  });

  describe('getPosts', () => {
    it('returns empty array when no posts exist or raw value is null', async () => {
      mockKv.get.mockResolvedValue(null);
      const posts = await adapter.getPosts();
      expect(posts).toEqual([]);
      expect(mockKv.get).toHaveBeenCalledWith('posts', 'json');
    });

    it('returns posts array when valid posts exist in KV', async () => {
      mockKv.get.mockResolvedValue([samplePost1, samplePost2]);
      const posts = await adapter.getPosts();
      expect(posts).toEqual([samplePost1, samplePost2]);
      expect(mockKv.get).toHaveBeenCalledWith('posts', 'json');
    });

    it('returns empty array when raw data is not an array', async () => {
      mockKv.get.mockResolvedValue({ notAnArray: true });
      const posts = await adapter.getPosts();
      expect(posts).toEqual([]);
    });

    it('returns empty array when kv.get throws an error', async () => {
      mockKv.get.mockRejectedValue(new Error('KV read failure'));
      const posts = await adapter.getPosts();
      expect(posts).toEqual([]);
    });
  });

  describe('savePosts', () => {
    it('saves new posts when no existing posts', async () => {
      mockKv.get.mockResolvedValue(null);
      mockKv.put.mockResolvedValue(undefined);

      await adapter.savePosts([samplePost1]);

      expect(mockKv.put).toHaveBeenCalledWith('posts', JSON.stringify([samplePost1]));
    });

    it('merges new posts with existing posts and deduplicates by id', async () => {
      mockKv.get.mockResolvedValue([samplePost1]);
      mockKv.put.mockResolvedValue(undefined);

      const updatedPost1: InternalPost = {
        ...samplePost1,
        title: 'Updated Post One',
      };

      await adapter.savePosts([updatedPost1, samplePost2]);

      expect(mockKv.put).toHaveBeenCalledTimes(1);
      const savedData = JSON.parse(mockKv.put.mock.calls[0][1]);
      // Should be sorted by publishedAt descending: samplePost2 (Mar 2) then updatedPost1 (Mar 1)
      expect(savedData).toHaveLength(2);
      expect(savedData[0]).toEqual(samplePost2);
      expect(savedData[1]).toEqual(updatedPost1);
    });

    it('sorts merged posts descending by publishedAt date', async () => {
      mockKv.get.mockResolvedValue([samplePost1]); // published 2026-03-01
      mockKv.put.mockResolvedValue(undefined);

      const newerPost: InternalPost = {
        ...samplePost2, // published 2026-03-02
        id: 'post-new',
      };

      await adapter.savePosts([newerPost]);

      const savedData = JSON.parse(mockKv.put.mock.calls[0][1]);
      expect(savedData[0].id).toBe('post-new');
      expect(savedData[1].id).toBe('post-1');
    });

    it('caps stored posts at 100 items', async () => {
      mockKv.get.mockResolvedValue([]);
      mockKv.put.mockResolvedValue(undefined);

      const manyPosts: InternalPost[] = Array.from({ length: 110 }, (_, i) => ({
        id: `post-${i}`,
        url: `https://example.com/${i}`,
        title: `Post ${i}`,
        content: `Content ${i}`,
        author: 'Author',
        publishedAt: new Date(2026, 0, 1, 0, i).toISOString(),
      }));

      await adapter.savePosts(manyPosts);

      const savedData = JSON.parse(mockKv.put.mock.calls[0][1]);
      expect(savedData).toHaveLength(100);
      // The newest posts (highest i) should be preserved
      expect(savedData[0].id).toBe('post-109');
    });
  });

  describe('getLastUpdate / setLastUpdate', () => {
    it('returns last update timestamp when available', async () => {
      mockKv.get.mockResolvedValue('2026-03-08T12:00:00Z');
      const lastUpdate = await adapter.getLastUpdate();
      expect(lastUpdate).toBe('2026-03-08T12:00:00Z');
      expect(mockKv.get).toHaveBeenCalledWith('last_update');
    });

    it('returns null when kv.get throws an error or key does not exist', async () => {
      mockKv.get.mockRejectedValue(new Error('KV read error'));
      const lastUpdate = await adapter.getLastUpdate();
      expect(lastUpdate).toBeNull();
    });

    it('sets last update timestamp', async () => {
      mockKv.put.mockResolvedValue(undefined);
      const timestamp = '2026-03-08T12:00:00Z';
      await adapter.setLastUpdate(timestamp);
      expect(mockKv.put).toHaveBeenCalledWith('last_update', timestamp);
    });
  });

  describe('getLastError / setLastError', () => {
    it('returns last error string when available', async () => {
      mockKv.get.mockResolvedValue('Fetch failed');
      const lastError = await adapter.getLastError();
      expect(lastError).toBe('Fetch failed');
      expect(mockKv.get).toHaveBeenCalledWith('last_error');
    });

    it('returns null when kv.get throws an error', async () => {
      mockKv.get.mockRejectedValue(new Error('KV read error'));
      const lastError = await adapter.getLastError();
      expect(lastError).toBeNull();
    });

    it('sets last error string when error is string', async () => {
      mockKv.put.mockResolvedValue(undefined);
      await adapter.setLastError('Something went wrong');
      expect(mockKv.put).toHaveBeenCalledWith('last_error', 'Something went wrong');
    });

    it('deletes last_error key when error is null', async () => {
      mockKv.delete.mockResolvedValue(undefined);
      await adapter.setLastError(null);
      expect(mockKv.delete).toHaveBeenCalledWith('last_error');
      expect(mockKv.put).not.toHaveBeenCalled();
    });
  });
});
