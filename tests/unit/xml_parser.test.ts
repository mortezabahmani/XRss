import { describe, it, expect } from 'vitest';
import { parseXmlItems } from '../../src/providers/xml_parser';

describe('parseXmlItems', () => {
  it('parses basic RSS xml items correctly', () => {
    const xml = `
      <rss version="2.0">
        <channel>
          <title>Test Feed</title>
          <item>
            <title>Test Title 1</title>
            <link>https://example.com/item1</link>
            <guid>item-1</guid>
            <description>Item 1 description</description>
            <author>Author One</author>
            <pubDate>Mon, 09 Mar 2026 10:00:00 GMT</pubDate>
          </item>
        </channel>
      </rss>
    `;

    const items = parseXmlItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      id: 'item-1',
      url: 'https://example.com/item1',
      title: 'Test Title 1',
      content: 'Item 1 description',
      author: 'Author One',
      pubDate: 'Mon, 09 Mar 2026 10:00:00 GMT'
    });
  });

  it('handles CDATA content and fallback tags (content:encoded, dc:creator, link as guid fallback)', () => {
    const xml = `
      <rss version="2.0">
        <channel>
          <item>
            <title><![CDATA[Title with CDATA]]></title>
            <link>https://example.com/item2</link>
            <content:encoded><![CDATA[<p>Full content in CDATA</p>]]></content:encoded>
            <dc:creator>Creator Name</dc:creator>
            <pubDate>Mon, 09 Mar 2026 11:00:00 GMT</pubDate>
          </item>
        </channel>
      </rss>
    `;

    const items = parseXmlItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('https://example.com/item2');
    expect(items[0].title).toBe('Title with CDATA');
    expect(items[0].content).toBe('<p>Full content in CDATA</p>');
    expect(items[0].author).toBe('Creator Name');
  });

  it('applies default author fallback when no author/dc:creator tag is present', () => {
    const xml = `
      <rss version="2.0">
        <channel>
          <item>
            <title>No Author Item</title>
            <link>https://example.com/item3</link>
            <description>Some content</description>
          </item>
        </channel>
      </rss>
    `;

    const itemsWithDefault = parseXmlItems(xml, 'Default Author');
    expect(itemsWithDefault[0].author).toBe('Default Author');

    const itemsWithoutDefault = parseXmlItems(xml);
    expect(itemsWithoutDefault[0].author).toBe('');
  });

  it('returns empty array when no <item> tags are present', () => {
    const xml = `<rss><channel><title>Empty</title></channel></rss>`;
    expect(parseXmlItems(xml)).toEqual([]);
  });
});
