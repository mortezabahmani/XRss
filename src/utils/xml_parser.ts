export interface ParsedXmlItem {
  id: string;
  url: string;
  title: string;
  content: string;
  author: string;
  pubDate: string;
}

export interface ParseXmlOptions {
  defaultAuthor?: string;
}

/**
 * Extracts the inner text of a given XML tag from an XML string snippet.
 * Strips CDATA wrappers and trims surrounding whitespace.
 */
export function extractXmlTag(xmlSnippet: string, tag: string): string {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i').exec(xmlSnippet);
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
}

/**
 * Parses RSS `<item>` elements from raw XML text into structured items.
 */
export function parseXmlItems(xmlText: string, options?: ParseXmlOptions): ParsedXmlItem[] {
  const items: ParsedXmlItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1];

    const title = extractXmlTag(itemContent, 'title');
    const link = extractXmlTag(itemContent, 'link');
    const description =
      extractXmlTag(itemContent, 'description') || extractXmlTag(itemContent, 'content:encoded');
    const pubDate = extractXmlTag(itemContent, 'pubDate');
    const rawAuthor =
      extractXmlTag(itemContent, 'author') || extractXmlTag(itemContent, 'dc:creator');
    const author = rawAuthor || options?.defaultAuthor || '';
    const guid = extractXmlTag(itemContent, 'guid') || link;

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
