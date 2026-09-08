import { describe, it, expect } from 'vitest';
import { extractXmlTag, parseXmlItems } from '../../src/utils/xml_parser';

describe('XML Parser Utility', () => {
  describe('extractXmlTag', () => {
    it('extracts tag content accurately', () => {
      const xml = '<title>  Hello World  </title>';
      expect(extractXmlTag(xml, 'title')).toBe('Hello World');
    });

    it('extracts tag content with attributes', () => {
      const xml = '<content:encoded attr="val">Some Content</content:encoded>';
      expect(extractXmlTag(xml, 'content:encoded')).toBe('Some Content');
    });

    it('strips CDATA sections and trims whitespace', () => {
      const xml = '<description><![CDATA[ <b>HTML Content</b> ]]></description>';
      expect(extractXmlTag(xml, 'description')).toBe('<b>HTML Content</b>');
    });

    it('returns empty string if tag does not exist', () => {
      const xml = '<item><title>Test</title></item>';
      expect(extractXmlTag(xml, 'missing')).toBe('');
    });
  });

  describe('parseXmlItems', () => {
    it('parses XML feed items with standard tags', () => {
      const rssXml = `
        <rss version="2.0">
          <channel>
            <item>
              <title>First Post</title>
              <link>https://example.com/post/1</link>
              <description>First description</description>
              <pubDate>Mon, 09 Mar 2026 10:00:00 GMT</pubDate>
              <author>Jane Doe</author>
              <guid>post-1</guid>
            </item>
          </channel>
        </rss>
      `;

      const items = parseXmlItems(rssXml);
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({
        id: 'post-1',
        url: 'https://example.com/post/1',
        title: 'First Post',
        content: 'First description',
        author: 'Jane Doe',
        pubDate: 'Mon, 09 Mar 2026 10:00:00 GMT'
      });
    });

    it('falls back to content:encoded, dc:creator, link for guid, and default author', () => {
      const rssXml = `
        <rss version="2.0">
          <channel>
            <item>
              <title>Alternative Tags Post</title>
              <link>https://example.com/post/2</link>
              <content:encoded><![CDATA[Detailed Content]]></content:encoded>
              <dc:creator>Creator Name</dc:creator>
              <pubDate>Mon, 09 Mar 2026 11:00:00 GMT</pubDate>
            </item>
            <item>
              <title>Minimal Post</title>
              <link>https://example.com/post/3</link>
            </item>
          </channel>
        </rss>
      `;

      const items = parseXmlItems(rssXml, { defaultAuthor: 'Default Author' });
      expect(items).toHaveLength(2);

      // Item 1
      expect(items[0].id).toBe('https://example.com/post/2');
      expect(items[0].content).toBe('Detailed Content');
      expect(items[0].author).toBe('Creator Name');

      // Item 2
      expect(items[1].id).toBe('https://example.com/post/3');
      expect(items[1].author).toBe('Default Author');
    });
  });
});
