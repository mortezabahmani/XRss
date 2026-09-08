import { InternalPost, XDataProvider } from '../core/types';
import { sanitizeHtml } from '../security/sanitizer';
import { validatePost } from '../core/validator';

export interface HttpProviderConfig {
  endpoint: string;
  timeoutMs?: number;
  userAgent?: string;
}

export class HttpDataProvider implements XDataProvider {
  private config: HttpProviderConfig;

  constructor(config: HttpProviderConfig) {
    this.config = config;
  }

  async fetchPosts(): Promise<InternalPost[]> {
    const timeout = this.config.timeoutMs || 10000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'GET',
        headers: {
          'User-Agent': this.config.userAgent || 'XRSS/1.0',
          'Accept': 'application/json, application/rss+xml, text/xml'
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Provider HTTP error: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      let rawPosts: unknown[] = [];

      if (contentType.includes('json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
        const json = JSON.parse(text);
        // Support common JSON formats (array or items property)
        if (Array.isArray(json)) {
          rawPosts = json;
        } else if (json && typeof json === 'object' && Array.isArray((json as any).items)) {
          rawPosts = (json as any).items;
        } else if (json && typeof json === 'object' && Array.isArray((json as any).posts)) {
          rawPosts = (json as any).posts;
        }
      } else {
        // Simple XML/RSS parsing fallback or structured parsing if needed
        // For v1 JSON/RSS provider, parse items via regex/DOM if XML
        rawPosts = this.parseSimpleXmlItems(text);
      }

      const posts: InternalPost[] = [];
      for (const raw of rawPosts) {
        const normalized = this.normalizeRawPost(raw);
        if (validatePost(normalized)) {
          posts.push(normalized);
        }
      }

      return posts;
    } catch (error) {
      throw new Error(`Failed to fetch and parse provider data: ${(error as Error).message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private normalizeRawPost(raw: any): InternalPost {
    return {
      id: String(raw.id || raw.guid || raw.url || Math.random()),
      url: String(raw.url || raw.link || ''),
      title: String(raw.title || 'Untitled'),
      content: sanitizeHtml(String(raw.content || raw.description || raw.summary || '')),
      author: String(raw.author || raw.creator || 'Unknown'),
      publishedAt: String(raw.publishedAt || raw.pubDate || raw.date || new Date().toISOString()),
      mediaUrls: Array.isArray(raw.mediaUrls) ? raw.mediaUrls : []
    };
  }

  private parseSimpleXmlItems(xmlText: string): any[] {
    const items: any[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

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
      const guid = getTag('guid') || link;

      items.push({
        id: guid,
        url: link,
        title,
        content: description,
        pubDate
      });
    }

    return items;
  }
}
