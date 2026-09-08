export interface InternalPost {
  id: string;
  url: string;
  title: string;
  content: string;
  author: string;
  publishedAt: string; // ISO 8601 string
  updatedAt?: string;
  mediaUrls?: string[];
}

export interface XDataProvider {
  fetchPosts(): Promise<InternalPost[]>;
}

export interface StorageAdapter {
  getPosts(): Promise<InternalPost[]>;
  savePosts(posts: InternalPost[]): Promise<void>;
  getLastUpdate(): Promise<string | null>;
  setLastUpdate(timestamp: string): Promise<void>;
  getLastError(): Promise<string | null>;
  setLastError(error: string | null): Promise<void>;
}
