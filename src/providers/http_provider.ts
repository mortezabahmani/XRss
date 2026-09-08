import { InternalPost, XDataProvider } from '../core/types';
import { normalizePost } from '../core/normalizer';
import { validatePost } from '../core/validator';

const ITEM_REGEX = /<item>([\s\S]*?)<\/item>/gi;
const CDATA_REGEX = /<!\[CDATA\[([\s\S]*?)\]\]>/g;

const TAG_REGEX_CACHE = new Map<string, RegExp>([
  ['title', /<title[^>]*>([\s\S]*?)<\/title>/i],
  ['link', /<link[^>]*>([\s\S]*?)<\/link>/i],
  ['description', /<description[^>]*>([\s\S]*?)<\/description>/i],
  ['content:encoded', /<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i],
  ['pubDate', /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i],
  ['author', /<author[^>]*>([\s\S]*?)<\/author>/i],
  ['dc:creator', /<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i],
  ['guid', /<guid[^>]*>([\s\S]*?)<\/guid>/i],
]);

function getTagValue(tag: string, content: string): string {
  let regex = TAG_REGEX_CACHE.get(tag);
  if (!regex) {
    regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i');
    TAG_REGEX_CACHE.set(tag, regex);
  }
  const match = regex.exec(content);
  return match ? match[1].replace(CDATA_REGEX, '$1').trim() : '';
}

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
    ITEM_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;

    try {
      while ((match = ITEM_REGEX.exec(xmlText)) !== null) {
        const itemContent = match[1];

        const title = getTagValue('title', itemContent);
        const link = getTagValue('link', itemContent);
        const description = getTagValue('description', itemContent) || getTagValue('content:encoded', itemContent);
        const pubDate = getTagValue('pubDate', itemContent);
        const author = getTagValue('author', itemContent) || getTagValue('dc:creator', itemContent);
        const guid = getTagValue('guid', itemContent) || link;

        items.push({
          id: guid,
          url: link,
          title,
          content: description,
          author,
          pubDate
        });
      }
    } finally {
      ITEM_REGEX.lastIndex = 0;
    }

    return items;
  }
}
