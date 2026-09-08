import { describe, it, expect, vi } from 'vitest';
import { XFeedProvider } from '../../src/providers/x_provider';

function generateSampleXml(itemCount: number): string {
  let itemsXml = '';
  for (let i = 0; i < itemCount; i++) {
    itemsXml += `
    <item>
      <title>Test Post Title ${i} with <![CDATA[CDATA Content ${i}]]></title>
      <link>https://x.com/user/status/${i}</link>
      <description><![CDATA[This is description for post ${i} with <b>HTML</b> content.]]></description>
      <content:encoded><![CDATA[Full encoded content for post ${i}]]></content:encoded>
      <pubDate>Mon, 09 Mar 2026 12:00:0${i % 10} GMT</pubDate>
      <author>@testuser${i % 5}</author>
      <dc:creator>Creator ${i}</dc:creator>
      <guid>https://x.com/user/status/${i}</guid>
    </item>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Sample X Feed</title>
    <link>https://x.com/user</link>
    <description>Sample feed for benchmarking</description>
    ${itemsXml}
  </channel>
</rss>`;
}

describe('XFeedProvider XML parsing benchmark', () => {
  it('parses XML items correctly and measures execution time', async () => {
    const itemCount = 1000;
    const xmlText = generateSampleXml(itemCount);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/rss+xml' },
        text: () => Promise.resolve(xmlText)
      })
    );

    const provider = new XFeedProvider({ endpoint: 'https://example.com/feed.xml' });

    // Warmup
    await provider.fetchPosts();

    // Measurement
    const iterations = 10;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await provider.fetchPosts();
    }
    const end = performance.now();
    const totalMs = end - start;
    const avgMs = totalMs / iterations;

    console.log(`[BENCHMARK] Parsed ${itemCount} items x ${iterations} iterations in ${totalMs.toFixed(2)}ms (avg: ${avgMs.toFixed(2)}ms per parse)`);

    const posts = await provider.fetchPosts();
    expect(posts.length).toBe(itemCount);
    expect(posts[0].title).toBe('Test Post Title 0 with CDATA Content 0');
    expect(posts[0].url).toBe('https://x.com/user/status/0');
  });
});
