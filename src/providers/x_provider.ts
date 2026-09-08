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

  private extractPostsFromJson(json: any): any[] {
    if (!json) return [];
    if (Array.isArray(json)) return json;
    if (typeof json === 'object') {
      if (Array.isArray(json.items)) return json.items;
      else if (Array.isArray(json.posts)) return json.posts;
      else if (Array.isArray(json.tweets)) return json.tweets;
      else if (Array.isArray(json.data)) return json.data;
      else if (json.user && Array.isArray(json.user.tweets)) return json.user.tweets;
      else if (json.tweet) return [json.tweet];
      // Single tweet or post fallback
      else if (json.id || json.id_str || json.tweet_id || json.text || json.content) {
        return [json];
      }
      // FxTwitter / VxTwitter user object fallback
      else if (json.user && (json.user.id || json.user.screen_name)) {
        const u = json.user;
        return [{
          id: String(u.id || u.screen_name),
          url: u.url || `https://x.com/${u.screen_name}`,
          title: u.name || u.screen_name || 'X Profile',
          content: u.description || u.raw_description?.text || '',
          author: u.name || u.screen_name || this.config.username || 'X User',
          publishedAt: u.joined || new Date().toISOString()
        }];
      }
    }
    return [];
  }

  private extractPostsFromNextData(htmlText: string): any[] {
    const items: any[] = [];
    const match = /<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s.exec(htmlText);
    if (!match) return items;

    try {
      const data = JSON.parse(match[1]);
      const timeline = data?.props?.pageProps?.timeline;
      const entries = timeline?.entries || [];

      for (const entry of entries) {
        const tweet = entry?.content?.item?.content?.tweet || entry?.tweet;
        if (tweet) {
          items.push({
            id: tweet.id_str || tweet.id,
            url: `https://x.com/${tweet.user?.screen_name || 'i'}/status/${tweet.id_str || tweet.id}`,
            title: tweet.full_text || tweet.text || 'X Post',
            content: tweet.full_text || tweet.text || '',
            author: tweet.user?.name || tweet.user?.screen_name || this.config.username || 'X User',
            publishedAt: tweet.created_at || new Date().toISOString()
          });
        }
      }
    } catch {}

    return items;
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
