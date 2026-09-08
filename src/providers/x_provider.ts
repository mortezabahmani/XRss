import { InternalPost, XDataProvider } from '../core/types';
import { normalizePost } from '../core/normalizer';
import { validatePost } from '../core/validator';

export interface XProviderConfig {
  username?: string;
  endpoint?: string;
  timeoutMs?: number;
  userAgent?: string;
}

export class XFeedProvider implements XDataProvider {
  private config: XProviderConfig;

  constructor(config: XProviderConfig) {
    this.config = config;
  }

  async fetchPosts(): Promise<InternalPost[]> {
    const username = (this.config.username || '').replace(/^@/, '').trim();
    
    // Construct endpoints pool (custom endpoint first, followed by public Nitter mirrors)
    const endpoints: string[] = [];
    if (this.config.endpoint) {
      endpoints.push(this.config.endpoint);
    }
    if (username) {
      endpoints.push(
        `https://nitter.poast.org/${username}/rss`,
        `https://nitter.privacydev.net/${username}/rss`,
        `https://nitter.net/${username}/rss`
      );
    }

    if (endpoints.length === 0) {
      throw new Error('No X username or provider endpoint configured.');
    }

    let lastError: Error | null = null;

    for (const endpoint of endpoints) {
      try {
        const posts = await this.fetchFromUrl(endpoint);
        if (posts.length > 0) {
          return posts;
        }
      } catch (err) {
        lastError = err as Error;
      }
    }

    throw lastError || new Error('Failed to fetch X posts from all configured endpoints.');
  }

  private async fetchFromUrl(url: string): Promise<InternalPost[]> {
    const timeout = this.config.timeoutMs || 10000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': this.config.userAgent || 'XRSS/1.0 (Mozilla/5.0 Compatible)',
          'Accept': 'application/rss+xml, application/xml, application/json, text/xml'
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} from ${url}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      let rawPosts: unknown[] = [];

      if (contentType.includes('json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          rawPosts = json;
        } else if (json && typeof json === 'object') {
          const obj = json as Record<string, unknown>;
          if (Array.isArray(obj.items)) rawPosts = obj.items;
          else if (Array.isArray(obj.posts)) rawPosts = obj.posts;
        }
      } else {
        rawPosts = this.parseXmlItems(text);
      }

      const validPosts: InternalPost[] = [];
      const seenIds = new Set<string>();

      for (const raw of rawPosts) {
        const normalized = normalizePost(raw);
        if (validatePost(normalized) && !seenIds.has(normalized.id)) {
          seenIds.add(normalized.id);
          validPosts.push(normalized);
        }
      }

      return validPosts;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private parseXmlItems(xmlText: string): any[] {
    const items: any[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemContent = match[1];
      const getTag = (tag: string) => {
        const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i').exec(itemContent);
        return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
      };

      const title = getTag('title');
      const link = getTag('link');
      const description = getTag('description') || getTag('content:encoded');
      const pubDate = getTag('pubDate');
      const author = getTag('author') || getTag('dc:creator');
      const guid = getTag('guid') || link;

      items.push({
        id: guid,
        url: link,
        title,
        content: description,
        author: author || this.config.username || 'X Post',
        pubDate
      });
    }

    return items;
  }
}
