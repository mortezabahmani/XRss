export interface ParsedXmlItem {
  id: string;
  url: string;
  title: string;
  content: string;
  author: string;
  pubDate: string;
}

/**
 * Parses RSS/XML text content and extracts items into structured objects.
 *
 * @param xmlText - The raw XML string content to parse.
 * @param defaultAuthor - Optional fallback author string if no author/dc:creator tag is found.
 * @returns Array of extracted items.
 */
export function parseXmlItems(xmlText: string, defaultAuthor: string = ''): ParsedXmlItem[] {
  const items: ParsedXmlItem[] = [];
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
    const rawAuthor = getTag('author') || getTag('dc:creator');
    const author = rawAuthor || defaultAuthor;
    const guid = getTag('guid') || link;

    items.push({
      id: guid,
      url: link,
      title,
      content: description,
      author,
      pubDate
    });
  }

  return items;
}
