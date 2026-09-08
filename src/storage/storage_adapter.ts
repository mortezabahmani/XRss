import { InternalPost, StorageAdapter } from '../core/types';

export class D1StorageAdapter implements StorageAdapter {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async initSchema(): Promise<void> {
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author TEXT NOT NULL,
        publishedAt TEXT NOT NULL,
        mediaUrls TEXT
      )
    `).run();

    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `).run();
  }

  async getPosts(): Promise<InternalPost[]> {
    const { results } = await this.db.prepare(
      'SELECT * FROM posts ORDER BY publishedAt DESC LIMIT 100'
    ).all();

    return (results || []).map((row: any) => ({
      id: row.id,
      url: row.url,
      title: row.title,
      content: row.content,
      author: row.author,
      publishedAt: row.publishedAt,
      mediaUrls: row.mediaUrls ? JSON.parse(row.mediaUrls) : []
    }));
  }

  async savePosts(posts: InternalPost[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO posts (id, url, title, content, author, publishedAt, mediaUrls)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const batchStmts = posts.map((p) => 
      stmt.bind(
        p.id,
        p.url,
        p.title,
        p.content,
        p.author,
        p.publishedAt,
        JSON.stringify(p.mediaUrls || [])
      )
    );

    if (batchStmts.length > 0) {
      await this.db.batch(batchStmts);
    }
  }

  async getLastUpdate(): Promise<string | null> {
    const res = await this.db.prepare(
      'SELECT value FROM metadata WHERE key = ?'
    ).bind('last_update').first();

    return res ? (res.value as string) : null;
  }

  async setLastUpdate(timestamp: string): Promise<void> {
    await this.db.prepare(
      'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)'
    ).bind('last_update', timestamp).run();
  }
}
