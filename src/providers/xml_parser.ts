export interface XmlFeedItem {
  id: string;
  url: string;
  title: string;
  content: string;
  author: string;
  pubDate: string;
}

export function parseXmlItems(xmlText: string, defaultAuthor?: string): XmlFeedItem[] {
  const items: XmlFeedItem[] = [];
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
      author: author || defaultAuthor || '',
      pubDate
    });
  }

  return items;
}
