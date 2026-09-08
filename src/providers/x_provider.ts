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
    const customEndpoint = (this.config.endpoint || '').trim();

    const targets: string[] = [];

    // 1. Custom optional override endpoint first if set
    if (customEndpoint) {
      targets.push(customEndpoint);
    }

    // 2. Built-in X provider endpoints for username
    if (username) {
      targets.push(
        `https://api.fxtwitter.com/${username}`,
        `https://api.vxtwitter.com/${username}`
      );
    }

    if (targets.length === 0) {
      throw new Error('No X username or provider endpoint configured.');
    }

    let lastError: Error | null = null;

    for (const url of targets) {
      try {
        const posts = await this.fetchFromUrl(url);
        if (posts && posts.length > 0) {
          return posts;
        }
      } catch (err) {
        lastError = err as Error;
      }
    }

    throw (
      lastError ||
      new Error(
        username
          ? `Failed to fetch public posts for @${username}.`
          : 'Failed to fetch posts from custom endpoint.'
      )
    );
  }

  private async fetchFromUrl(url: string): Promise<InternalPost[]> {
    const timeout = this.config.timeoutMs || 10000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent':
            this.config.userAgent ||
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          'Accept': 'application/json, application/rss+xml, text/xml, text/html, */*'
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
        rawPosts = this.extractPostsFromJson(json);
      } else if (text.includes('__NEXT_DATA__')) {
        rawPosts = this.extractPostsFromNextData(text);
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

  private extractPostsFromJson(json: unknown): unknown[] {
    if (!json) return [];
    if (Array.isArray(json)) return json;
    if (typeof json === 'object') {
      const obj = json as Record<string, unknown>;
      if (Array.isArray(obj.items)) return obj.items;
      else if (Array.isArray(obj.posts)) return obj.posts;
      else if (Array.isArray(obj.tweets)) return obj.tweets;
      else if (Array.isArray(obj.data)) return obj.data;
      else if (obj.user && typeof obj.user === 'object' && Array.isArray((obj.user as Record<string, unknown>).tweets)) {
        return (obj.user as Record<string, unknown>).tweets as unknown[];
      }
      else if (obj.tweet) return [obj.tweet];
      // Single tweet or post fallback
      else if (obj.id || obj.id_str || obj.tweet_id || obj.text || obj.content) {
        return [obj];
      }
      // FxTwitter / VxTwitter user object fallback
      else if (obj.user && typeof obj.user === 'object' && obj.user !== null) {
        const u = obj.user as Record<string, unknown>;
        if (u.id || u.screen_name) {
          const rawDesc = u.raw_description as Record<string, unknown> | undefined;
          return [{
            id: String(u.id || u.screen_name),
            url: u.url ? String(u.url) : `https://x.com/${u.screen_name}`,
            title: String(u.name || u.screen_name || 'X Profile'),
            content: String(u.description || rawDesc?.text || ''),
            author: String(u.name || u.screen_name || this.config.username || 'X User'),
            publishedAt: String(u.joined || new Date().toISOString())
          }];
        }
      }
    }
    return [];
  }

  private extractPostsFromNextData(htmlText: string): unknown[] {
    const items: unknown[] = [];
    const match = /<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s.exec(htmlText);
    if (!match) return items;

    try {
      const data = JSON.parse(match[1]) as Record<string, unknown>;
      const props = data?.props as Record<string, unknown> | undefined;
      const pageProps = props?.pageProps as Record<string, unknown> | undefined;
      const timeline = pageProps?.timeline as Record<string, unknown> | undefined;
      const entries = (Array.isArray(timeline?.entries) ? timeline.entries : []) as Record<string, unknown>[];

      for (const entry of entries) {
        const content = entry?.content as Record<string, unknown> | undefined;
        const item = content?.item as Record<string, unknown> | undefined;
        const itemContent = item?.content as Record<string, unknown> | undefined;
        const tweet = (itemContent?.tweet || entry?.tweet) as Record<string, unknown> | undefined;

        if (tweet) {
          const user = tweet.user as Record<string, unknown> | undefined;
          const id = String(tweet.id_str || tweet.id || '');
          const screenName = String(user?.screen_name || 'i');
          const fullText = String(tweet.full_text || tweet.text || 'X Post');
          const author = String(user?.name || user?.screen_name || this.config.username || 'X User');
          const publishedAt = String(tweet.created_at || new Date().toISOString());

          items.push({
            id,
            url: `https://x.com/${screenName}/status/${id}`,
            title: fullText,
            content: String(tweet.full_text || tweet.text || ''),
            author,
            publishedAt
          });
        }
      }
    } catch {}

    return items;
  }

  private parseXmlItems(xmlText: string): unknown[] {
    const items: unknown[] = [];
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
