import { InternalPost, XDataProvider } from '../core/types';
import { normalizePost } from '../core/normalizer';
import { validatePost } from '../core/validator';

export interface XProviderConfig {
  username?: string;
  authToken?: string;
  csrfToken?: string;
  endpoint?: string;
  timeoutMs?: number;
  userAgent?: string;
}

const DEFAULT_BEARER_TOKEN = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

function safeJsonParse<T = any>(text: string): T | null {
  if (!text || typeof text !== 'string' || !text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export class XFeedProvider implements XDataProvider {
  private config: XProviderConfig;

  constructor(config: XProviderConfig) {
    this.config = config;
  }

  async fetchPosts(): Promise<InternalPost[]> {
    const username = (this.config.username || '').replace(/^@/, '').trim();
    const rawAuthToken = (this.config.authToken || '').trim().replace(/^["']|["']$/g, '');
    const rawCsrfToken = (this.config.csrfToken || '').trim().replace(/^["']|["']$/g, '');
    const customEndpoint = (this.config.endpoint || '').trim();

    const authToken = (rawAuthToken === 'undefined' || rawAuthToken === 'null' || rawAuthToken === '***') ? '' : rawAuthToken;
    const csrfToken = (rawCsrfToken === 'undefined' || rawCsrfToken === 'null' || rawCsrfToken === '***') ? '' : rawCsrfToken;

    let lastError: Error | null = null;

    // 1. Authenticated Direct X API (GraphQL / v1.1 timeline with session cookies)
    if (username && authToken && csrfToken) {
      try {
        const posts = await this.fetchAuthenticatedTimeline(username, authToken, csrfToken);
        if (posts && posts.length > 0) {
          return posts;
        }
      } catch (err) {
        lastError = err as Error;
      }
    }

    // 2. Custom optional override endpoint if set
    if (customEndpoint) {
      try {
        const posts = await this.fetchFromUrl(customEndpoint);
        if (posts && posts.length > 0) {
          return posts;
        }
      } catch (err) {
        lastError = err as Error;
      }
    }

    // 3. Fallback to public endpoints if available
    if (username && !authToken && !csrfToken) {
      const publicTargets = [
        `https://api.vxtwitter.com/${username}`
      ];

      for (const url of publicTargets) {
        try {
          const posts = await this.fetchFromUrl(url);
          if (posts && posts.length > 0) {
            return posts;
          }
        } catch (err) {
          lastError = err as Error;
        }
      }
    }

    if (!username && !customEndpoint) {
      throw new Error('No X username or provider endpoint configured.');
    }

    if (username && (!authToken || !csrfToken) && !customEndpoint) {
      throw new Error(
        `X.com auth_token or ct0 cookie is missing for @${username}. Note: auth_token is HttpOnly so document.cookie cannot read it. Copy auth_token from F12 -> Application -> Cookies -> https://x.com.`
      );
    }

    throw (
      lastError ||
      new Error(
        username
          ? `Failed to fetch public posts for @${username}. Check if auth_token / ct0 cookies expired.`
          : 'Failed to fetch posts from custom endpoint.'
      )
    );
  }

  private async fetchAuthenticatedTimeline(
    username: string,
    authToken: string,
    csrfToken: string
  ): Promise<InternalPost[]> {
    const headers = {
      'Authorization': DEFAULT_BEARER_TOKEN,
      'x-csrf-token': csrfToken,
      'cookie': `auth_token=${authToken}; ct0=${csrfToken}`,
      'User-Agent':
        this.config.userAgent ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'x-twitter-active-user': 'yes',
      'x-twitter-client-language': 'en',
      'x-twitter-auth-type': 'OAuth2Session',
      'Origin': 'https://x.com',
      'Referer': `https://x.com/${encodeURIComponent(username)}`,
      'Accept': 'application/json, text/plain, */*'
    };

    const timeout = this.config.timeoutMs || 12000;
    let authError: Error | null = null;

    // Strategy A: X REST v1.1 user_timeline
    try {
      const v1Url = `https://api.x.com/1.1/statuses/user_timeline.json?screen_name=${encodeURIComponent(username)}&count=30&include_rts=true&tweet_mode=extended`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const resp = await fetch(v1Url, { method: 'GET', headers, signal: controller.signal });
      clearTimeout(timeoutId);

      const text = await resp.text();
      const json = safeJsonParse(text);

      if (resp.ok) {
        if (json && Array.isArray(json) && json.length > 0) {
          const posts = this.processRawPosts(json);
          if (posts.length > 0) return posts;
        }
      } else if (json && json.errors && json.errors[0]) {
        authError = new Error(`X API Error (${json.errors[0].code || resp.status}): ${json.errors[0].message}`);
      } else {
        authError = new Error(`HTTP ${resp.status} ${resp.statusText} from X v1.1 API`);
      }
    } catch (err) {
      authError = err as Error;
    }

    // Strategy B: X GraphQL UserByScreenName -> UserTweets
    try {
      const userGqlUrl = `https://x.com/i/api/graphql/sLVLhkPhdiv-HOWdYFiAuA/UserByScreenName?variables=${encodeURIComponent(
        JSON.stringify({ screen_name: username, withSafetyModeUserFields: true })
      )}&features=${encodeURIComponent(
        JSON.stringify({
          responsive_web_graphql_exclude_directive_enabled: true,
          verified_phone_label_enabled: false,
          responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
          responsive_web_graphql_timeline_navigation_enabled: true
        })
      )}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const userResp = await fetch(userGqlUrl, { method: 'GET', headers, signal: controller.signal });
      clearTimeout(timeoutId);

      const userText = await userResp.text();
      const userData = safeJsonParse(userText);

      if (userResp.ok) {
        const restId = userData?.data?.user?.result?.rest_id;

        if (restId) {
          const tweetsGqlUrl = `https://x.com/i/api/graphql/VfZDVyUt_hvfVjhGJuhccw/UserTweets?variables=${encodeURIComponent(
            JSON.stringify({
              userId: restId,
              count: 30,
              includePromotedContent: false,
              withQuickPromoteEligibilityResponse: false,
              withVoice: true,
              withV2Timeline: true
            })
          )}&features=${encodeURIComponent(
            JSON.stringify({
              responsive_web_graphql_exclude_directive_enabled: true,
              verified_phone_label_enabled: false,
              responsive_web_graphql_timeline_navigation_enabled: true,
              responsive_web_graphql_skip_user_profile_image_extensions_enabled: false
            })
          )}`;

          const tController = new AbortController();
          const tTimeoutId = setTimeout(() => tController.abort(), timeout);

          const tweetsResp = await fetch(tweetsGqlUrl, { method: 'GET', headers, signal: tController.signal });
          clearTimeout(tTimeoutId);

          const tweetsText = await tweetsResp.text();
          const tweetsData = safeJsonParse(tweetsText);

          if (tweetsResp.ok) {
            const rawGqlTweets = this.extractGraphQLTweets(tweetsData);
            if (rawGqlTweets.length > 0) {
              const posts = this.processRawPosts(rawGqlTweets);
              if (posts.length > 0) return posts;
            }
          } else if (tweetsData && tweetsData.errors && tweetsData.errors[0]) {
            authError = new Error(`X GraphQL Error (${tweetsData.errors[0].code || tweetsResp.status}): ${tweetsData.errors[0].message}`);
          }
        }
      } else if (userData && userData.errors && userData.errors[0]) {
        authError = new Error(`X GraphQL User Error (${userData.errors[0].code || userResp.status}): ${userData.errors[0].message}`);
      }
    } catch (err) {
      if (!authError) authError = err as Error;
    }

    throw authError || new Error(`X.com session authentication failed for @${username}. Check if auth_token / ct0 cookies expired.`);
  }

  private extractGraphQLTweets(data: any): any[] {
    const tweets: any[] = [];
    if (!data || typeof data !== 'object') return tweets;
    try {
      const instructions = data?.data?.user?.result?.timeline_v2?.timeline?.instructions || [];
      for (const inst of instructions) {
        const entries = inst?.entries || (inst?.entry ? [inst.entry] : []);
        for (const entry of entries) {
          const result = entry?.content?.itemContent?.tweet_results?.result;
          const tweetData = result?.tweet || result;
          if (tweetData && tweetData.legacy) {
            const legacy = tweetData.legacy;
            const userLegacy = tweetData.core?.user_results?.result?.legacy || {};
            tweets.push({
              id: legacy.id_str || legacy.id || tweetData.rest_id,
              url: `https://x.com/${userLegacy.screen_name || this.config.username || 'i'}/status/${legacy.id_str || legacy.id || tweetData.rest_id}`,
              title: legacy.full_text || legacy.text || 'X Post',
              content: legacy.full_text || legacy.text || '',
              author: userLegacy.name || userLegacy.screen_name || this.config.username || 'X User',
              publishedAt: legacy.created_at || new Date().toISOString()
            });
          }
        }
      }
    } catch {}
    return tweets;
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
        const json = safeJsonParse(text);
        rawPosts = this.extractPostsFromJson(json);
      } else if (text.includes('__NEXT_DATA__')) {
        rawPosts = this.extractPostsFromNextData(text);
      } else {
        rawPosts = this.parseXmlItems(text);
      }

      return this.processRawPosts(rawPosts);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private processRawPosts(rawPosts: unknown[]): InternalPost[] {
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
  }

  private extractPostsFromJson(json: any): any[] {
    if (!json) return [];
    if (Array.isArray(json)) return json;
    if (typeof json === 'object') {
      if (Array.isArray(json.items)) return json.items;
      else if (Array.isArray(json.posts)) return json.posts;
      else if (Array.isArray(json.tweets)) return json.tweets;
      else if (Array.isArray(json.data)) return json.data;
    }
    return [];
  }

  private extractPostsFromNextData(htmlText: string): any[] {
    const items: any[] = [];
    const match = /<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s.exec(htmlText);
    if (!match) return items;

    try {
      const data = safeJsonParse(match[1]);
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
