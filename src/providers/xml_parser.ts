export interface XmlFeedItem {
  id: string;
  url: string;
  title: string;
  content: string;
  author: string;
  pubDate: string;
}

const ITEM_REGEX = /<item>([\s\S]*?)<\/item>/gi;
const CDATA_REGEX = /<!\[CDATA\[([\s\S]*?)\]\]>/g;

const TAG_REGEXES: Record<string, RegExp> = {
  title: /<title[^>]*>([\s\S]*?)<\/title>/i,
  link: /<link[^>]*>([\s\S]*?)<\/link>/i,
  description: /<description[^>]*>([\s\S]*?)<\/description>/i,
  contentEncoded: /<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i,
  pubDate: /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i,
  author: /<author[^>]*>([\s\S]*?)<\/author>/i,
  creator: /<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i,
  guid: /<guid[^>]*>([\s\S]*?)<\/guid>/i
};

export function parseXmlItems(xmlText: string, defaultAuthor?: string): XmlFeedItem[] {
  const items: XmlFeedItem[] = [];
  ITEM_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  const getTag = (itemContent: string, regex: RegExp) => {
    const m = regex.exec(itemContent);
    return m ? m[1].replace(CDATA_REGEX, '$1').trim() : '';
  };

  while ((match = ITEM_REGEX.exec(xmlText)) !== null) {
    const itemContent = match[1];
    const title = getTag(itemContent, TAG_REGEXES.title);
    const link = getTag(itemContent, TAG_REGEXES.link);
    const description = getTag(itemContent, TAG_REGEXES.description) || getTag(itemContent, TAG_REGEXES.contentEncoded);
    const pubDate = getTag(itemContent, TAG_REGEXES.pubDate);
    const author = getTag(itemContent, TAG_REGEXES.author) || getTag(itemContent, TAG_REGEXES.creator);
    const guid = getTag(itemContent, TAG_REGEXES.guid) || link;

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
