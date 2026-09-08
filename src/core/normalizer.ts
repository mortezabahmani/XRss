import { InternalPost } from './types';
import { sanitizeHtml } from '../security/sanitizer';

export function normalizePost(raw: any): InternalPost {
  if (!raw || typeof raw !== 'object') {
    return {
      id: String(Math.random()),
      url: '',
      title: 'Untitled',
      content: '',
      author: 'Unknown',
      publishedAt: new Date().toISOString()
    };
  }

  const id = String(raw.id || raw.guid || raw.url || raw.link || Math.random());
  const url = String(raw.url || raw.link || '').trim();
  const title = String(raw.title || raw.text || 'Untitled').trim();
  const rawContent = String(raw.content || raw.description || raw.summary || raw.text || '');
  const content = sanitizeHtml(rawContent);
  const author = String(raw.author || raw.creator || raw.user?.name || 'Unknown').trim();
  
  let publishedAt = String(raw.publishedAt || raw.pubDate || raw.date || raw.created_at || '');
  if (!publishedAt || Number.isNaN(Date.parse(publishedAt))) {
    publishedAt = new Date().toISOString();
  } else {
    publishedAt = new Date(publishedAt).toISOString();
  }

  const mediaUrls: string[] = Array.isArray(raw.mediaUrls)
    ? raw.mediaUrls.map(String)
    : Array.isArray(raw.media)
    ? raw.media.map(String)
    : [];

  return {
    id,
    url,
    title: title || 'Untitled',
    content,
    author: author || 'Unknown',
    publishedAt,
    mediaUrls
  };
}
