import { InternalPost, XDataProvider } from '../core/types';
import { normalizePost } from '../core/normalizer';
import { validatePost } from '../core/validator';
import { parseXmlItems } from './xml_parser';

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
        rawPosts = parseXmlItems(text);
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
}
