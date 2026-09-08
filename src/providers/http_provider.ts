import { InternalPost, XDataProvider } from '../core/types';
import { normalizePost } from '../core/normalizer';
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
          'Accept': 'application/json, application/rss+xml, text/xml, application/xml'
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
        if (Array.isArray(json)) {
          rawPosts = json;
        } else if (json && typeof json === 'object') {
          const obj = json as Record<string, unknown>;
          if (Array.isArray(obj.items)) rawPosts = obj.items;
          else if (Array.isArray(obj.posts)) rawPosts = obj.posts;
          else if (Array.isArray(obj.data)) rawPosts = obj.data;
        }
      } else {
        rawPosts = this.parseXmlItems(text);
      }

      const validPosts: InternalPost[] = [];
      for (const raw of rawPosts) {
        const normalized = normalizePost(raw);
        if (validatePost(normalized)) {
          validPosts.push(normalized);
        }
      }

      return validPosts;
    } catch (error) {
      throw new Error(`Failed to fetch provider data: ${(error as Error).message}`);
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
        author,
        pubDate
      });
    }

    return items;
  }
}
