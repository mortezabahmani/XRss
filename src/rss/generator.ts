import { InternalPost } from '../core/types';

export interface FeedMeta {
  title: string;
  link: string;
  description: string;
  language?: string;
}

export function generateRssFeed(meta: FeedMeta, posts: InternalPost[]): string {
  const escapeXml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const escapeCdata = (str: string) => {
    return str.replace(/\]\]>/g, ']]&gt;');
  };

  const itemsXml = posts
    .map((post) => {
      const pubDate = new Date(post.publishedAt).toUTCString();
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(post.url)}</link>
      <guid isPermaLink="true">${escapeXml(post.url)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${escapeCdata(post.content)}]]></description>
      <author>${escapeXml(post.author)}</author>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(meta.title)}</title>
    <link>${escapeXml(meta.link)}</link>
    <description>${escapeXml(meta.description)}</description>
    <language>${meta.language || 'en-us'}</language>
    <atom:link href="${escapeXml(meta.link)}" rel="self" type="application/rss+xml"/>
${itemsXml}
  </channel>
</rss>`;
}
