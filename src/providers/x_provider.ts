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

const DEFAULT_BEARER_TOKEN =
  'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

const USER_BY_SCREEN_NAME_QUERY_IDS = [
  'G3_K324f22R1e2nQ0vL5XQ',
  'n3544y15P-3pS0i1l-3fyg',
  'sLVLhkPhdiv-HOWdYFiAuA'
];

const USER_TWEETS_QUERY_IDS = [
  '_x-X8I-K1Yf21g_m',
  'VfZDVyUt_hvfVjhGJuhccw',
  'xT-3T_s_L_v5G558X1_u_g'
];

const DEFAULT_FEATURE_FLAGS = {
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true,
  tweetypie_unmention_optimization_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_grok_responses: false,
  rweb_video_timestamps_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_enhance_cards_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true
};

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

    const authToken =
      rawAuthToken === 'undefined' || rawAuthToken === 'null' || rawAuthToken === '***'
        ? ''
        : rawAuthToken;
    const csrfToken =
      rawCsrfToken === 'undefined' || rawCsrfToken === 'null' || rawCsrfToken === '***'
        ? ''
        : rawCsrfToken;

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
      const publicTargets = [`https://api.vxtwitter.com/${username}`];

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
      Authorization: DEFAULT_BEARER_TOKEN,
      'x-csrf-token': csrfToken,
      cookie: `auth_token=${authToken}; ct0=${csrfToken}`,
      'User-Agent':
        this.config.userAgent ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'x-twitter-active-user': 'yes',
      'x-twitter-client-language': 'en',
      'x-twitter-auth-type': 'OAuth2Session',
      Origin: 'https://x.com',
      Referer: `https://x.com/${encodeURIComponent(username)}`,
      Accept: 'application/json, text/plain, */*'
    };

    const timeout = this.config.timeoutMs || 12000;
    const strategyErrors: string[] = [];

    // Strategy A: X REST v1.1 user_timeline
    try {
      const v1Url = `https://api.x.com/1.1/statuses/user_timeline.json?screen_name=${encodeURIComponent(
        username
      )}&count=30&include_rts=true&tweet_mode=extended`;
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
      } else {
        const errDetail =
          json && json.errors
            ? JSON.stringify(json.errors)
            : text || resp.statusText;
        strategyErrors.push(`[Strategy A: REST v1.1 user_timeline] HTTP ${resp.status}: ${errDetail}`);
      }
    } catch (err) {
      strategyErrors.push(`[Strategy A: REST v1.1 user_timeline] Error: ${(err as Error).message}`);
    }

    // Strategy B: X GraphQL UserByScreenName -> UserTweets
    for (const queryId of USER_BY_SCREEN_NAME_QUERY_IDS) {
      try {
        const userGqlUrl = `https://x.com/i/api/graphql/${queryId}/UserByScreenName?variables=${encodeURIComponent(
          JSON.stringify({ screen_name: username, withSafetyModeUserFields: true })
        )}&features=${encodeURIComponent(JSON.stringify(DEFAULT_FEATURE_FLAGS))}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const userResp = await fetch(userGqlUrl, { method: 'GET', headers, signal: controller.signal });
        clearTimeout(timeoutId);

        const userText = await userResp.text();
        const userData = safeJsonParse(userText);

        if (userResp.ok) {
          const restId = userData?.data?.user?.result?.rest_id;

          if (restId) {
            for (const tweetQueryId of USER_TWEETS_QUERY_IDS) {
              try {
                const tweetsGqlUrl = `https://x.com/i/api/graphql/${tweetQueryId}/UserTweets?variables=${encodeURIComponent(
                  JSON.stringify({
                    userId: restId,
                    count: 30,
                    includePromotedContent: false,
                    withQuickPromoteEligibilityResponse: false,
                    withVoice: true,
                    withV2Timeline: true
                  })
                )}&features=${encodeURIComponent(JSON.stringify(DEFAULT_FEATURE_FLAGS))}`;

                const tController = new AbortController();
                const tTimeoutId = setTimeout(() => tController.abort(), timeout);

                const tweetsResp = await fetch(tweetsGqlUrl, {
                  method: 'GET',
                  headers,
                  signal: tController.signal
                });
                clearTimeout(tTimeoutId);

                const tweetsText = await tweetsResp.text();
                const tweetsData = safeJsonParse(tweetsText);

                if (tweetsResp.ok) {
                  const rawGqlTweets = this.extractGraphQLTweets(tweetsData, username);
                  if (rawGqlTweets.length > 0) {
                    const posts = this.processRawPosts(rawGqlTweets);
                    if (posts.length > 0) return posts;
                  }
                } else {
                  const errDetail =
                    tweetsData && tweetsData.errors
                      ? JSON.stringify(tweetsData.errors)
                      : tweetsText || tweetsResp.statusText;
                  strategyErrors.push(
                    `[Strategy B: GraphQL UserTweets (${tweetQueryId})] HTTP ${tweetsResp.status}: ${errDetail}`
                  );
                }
              } catch (err) {
                strategyErrors.push(
                  `[Strategy B: GraphQL UserTweets (${tweetQueryId})] Error: ${(err as Error).message}`
                );
              }
            }
          } else if (userData?.errors) {
            strategyErrors.push(
              `[Strategy B: GraphQL UserByScreenName (${queryId})] HTTP ${userResp.status}: ${JSON.stringify(
                userData.errors
              )}`
            );
          }
        } else {
          const errDetail =
            userData && userData.errors
              ? JSON.stringify(userData.errors)
              : userText || userResp.statusText;
          strategyErrors.push(
            `[Strategy B: GraphQL UserByScreenName (${queryId})] HTTP ${userResp.status}: ${errDetail}`
          );
        }
      } catch (err) {
        strategyErrors.push(
          `[Strategy B: GraphQL UserByScreenName (${queryId})] Error: ${(err as Error).message}`
        );
      }
    }

    const aggregatedErr =
      strategyErrors.length > 0
        ? strategyErrors.join(' | ')
        : `X.com session authentication failed for @${username}. Check if auth_token / ct0 cookies expired.`;

    throw new Error(aggregatedErr);
  }

  public extractGraphQLTweets(data: any, fallbackUsername?: string): any[] {
    const tweets: any[] = [];
    if (!data || typeof data !== 'object') return tweets;
    try {
      const userResult = data?.data?.user?.result;
      const timeline = userResult?.timeline_v2?.timeline || userResult?.timeline?.timeline;
      const instructions = timeline?.instructions || [];

      for (const inst of instructions) {
        const entries = inst?.entries || (inst?.entry ? [inst.entry] : []);
        for (const entry of entries) {
          const result = entry?.content?.itemContent?.tweet_results?.result;
          const tweetData = result?.tweet || result;
          if (tweetData && tweetData.legacy) {
            const legacy = tweetData.legacy;
            const userLegacy = tweetData.core?.user_results?.result?.legacy || {};
            const screenName = userLegacy.screen_name || fallbackUsername || this.config.username || 'i';
            const tweetId = legacy.id_str || legacy.id || tweetData.rest_id;
            const text = legacy.full_text || legacy.text;

            if (tweetId && text) {
              tweets.push({
                id: String(tweetId),
                url: `https://x.com/${screenName}/status/${tweetId}`,
                title: text,
                content: text,
                author: userLegacy.name || userLegacy.screen_name || fallbackUsername || this.config.username || 'X User',
                publishedAt: legacy.created_at || new Date().toISOString()
              });
            }
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
          Accept: 'application/json, application/rss+xml, text/xml, text/html, */*'
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`[Strategy C: Custom/Public Endpoint] HTTP ${response.status} ${response.statusText} from ${url}`);
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
      if (!raw || typeof raw !== 'object') continue;
      const rec = raw as Record<string, any>;

      // Explicit status check: Reject profile-only JSON payloads (which lack tweet status id or status text)
      const tweetId = rec.id_str || rec.id || rec.rest_id || rec.guid;
      const text = rec.full_text || rec.text || rec.content || rec.title;

      if (!tweetId || !text || typeof text !== 'string' || !text.trim()) {
        continue;
      }

      // Reject profile JSON payloads that only contain user info (e.g. name, screen_name, description) without a tweet status URL or status text
      if (rec.screen_name && rec.description && !rec.id_str && !rec.tweet_id && !String(rec.url || '').includes('/status/')) {
        continue;
      }

      const strId = String(tweetId).trim();
      const normalized = normalizePost(raw);

      // Standardize status URL to https://x.com/{user}/status/{id}
      if (!normalized.url.includes('/status/') && strId) {
        const user = rec.user?.screen_name || rec.author || this.config.username || 'i';
        normalized.url = `https://x.com/${user}/status/${strId}`;
      } else if (normalized.url.includes('twitter.com/')) {
        normalized.url = normalized.url.replace('twitter.com/', 'x.com/');
      }

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
      if (Array.isArray(json.posts)) return json.posts;
      if (Array.isArray(json.tweets)) return json.tweets;
      if (Array.isArray(json.data)) return json.data;

      // Reject profile-only JSON payload without tweet items
      if (json.screen_name || json.description || json.user) {
        if ((json.id_str || json.id) && (json.full_text || json.text) && (json.tweet_id || String(json.url || '').includes('/status/'))) {
          return [json];
        }
        return [];
      }
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
