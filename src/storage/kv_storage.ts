import { InternalPost, StorageAdapter } from '../core/types';

export class KVStorageAdapter implements StorageAdapter {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  async getPosts(): Promise<InternalPost[]> {
    try {
      const raw = await this.kv.get('posts', 'json');
      return Array.isArray(raw) ? (raw as InternalPost[]) : [];
    } catch {
      return [];
    }
  }

  async savePosts(posts: InternalPost[]): Promise<void> {
    const existing = await this.getPosts();
    const map = new Map<string, InternalPost>();
    for (const p of existing) map.set(p.id, p);
    for (const p of posts) map.set(p.id, p);

    const merged = Array.from(map.values())
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 100);

    await this.kv.put('posts', JSON.stringify(merged));
  }

  async getLastUpdate(): Promise<string | null> {
    try {
      return await this.kv.get('last_update');
    } catch {
      return null;
    }
  }

  async setLastUpdate(timestamp: string): Promise<void> {
    await this.kv.put('last_update', timestamp);
  }

  async getLastError(): Promise<string | null> {
    try {
      return await this.kv.get('last_error');
    } catch {
      return null;
    }
  }

  async setLastError(error: string | null): Promise<void> {
    if (error === null) {
      await this.kv.delete('last_error');
    } else {
      await this.kv.put('last_error', error);
    }
  }
}
