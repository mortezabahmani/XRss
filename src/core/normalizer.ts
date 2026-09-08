import { InternalPost } from './types';
import { sanitizeHtml } from '../security/sanitizer';

export function normalizePost(raw: unknown): InternalPost {
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

  const r = raw as Record<string, unknown>;
  const user = (r.user && typeof r.user === 'object') ? (r.user as Record<string, unknown>) : undefined;

  const id = String(r.id || r.guid || r.url || r.link || Math.random());
  const url = String(r.url || r.link || '').trim();
  const rawTitle = String(r.title || r.text || 'Untitled').trim();
  const title = sanitizeHtml(rawTitle).trim();
  const rawContent = String(r.content || r.description || r.summary || r.text || '');
  const content = sanitizeHtml(rawContent);
  const author = String(r.author || r.creator || user?.name || 'Unknown').trim();
  
  let publishedAt = String(r.publishedAt || r.pubDate || r.date || r.created_at || '');
  if (!publishedAt || Number.isNaN(Date.parse(publishedAt))) {
    publishedAt = new Date().toISOString();
  } else {
    publishedAt = new Date(publishedAt).toISOString();
  }

  const mediaUrls: string[] = Array.isArray(r.mediaUrls)
    ? r.mediaUrls.map(String)
    : Array.isArray(r.media)
    ? r.media.map(String)
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
