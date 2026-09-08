import { describe, it, expect } from 'vitest';
import { generateRssFeed } from '../../src/rss/generator';

describe('RSS Generator', () => {
  it('generates RSS feed correctly for standard posts', () => {
    const meta = {
      title: 'Test Feed',
      link: 'https://example.com/feed',
      description: 'Test Feed Description'
    };
    const posts = [
      {
        id: '1',
        title: 'Hello World',
        content: 'This is a post',
        url: 'https://example.com/post/1',
        publishedAt: '2023-01-01T00:00:00Z',
        author: 'John Doe'
      }
    ];

    const xml = generateRssFeed(meta, posts);
    expect(xml).toContain('<title>Test Feed</title>');
    expect(xml).toContain('<title>Hello World</title>');
    expect(xml).toContain('<description><![CDATA[This is a post]]></description>');
  });

  it('escapes CDATA end sequence ]]> in post content to prevent XML injection', () => {
    const meta = {
      title: 'Security Test Feed',
      link: 'https://example.com/feed',
      description: 'Feed'
    };
    const posts = [
      {
        id: '2',
        title: 'Malicious CDATA Payload',
        content: 'Normal content ]]> <script>alert("injected")</script>',
        url: 'https://example.com/post/2',
        publishedAt: '2023-01-01T00:00:00Z',
        author: 'Attacker'
      }
    ];

    const xml = generateRssFeed(meta, posts);
    expect(xml).not.toContain(']]> <script>');
    expect(xml).toContain('<![CDATA[Normal content ]]&gt; <script>alert("injected")</script>]]>');
  });
});
