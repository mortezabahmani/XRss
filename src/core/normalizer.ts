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

  const record = raw as Record<string, unknown>;

  const id = String(record.id || record.guid || record.url || record.link || Math.random());
  const url = String(record.url || record.link || '').trim();
  const rawTitle = String(record.title || record.text || 'Untitled').trim();
  const title = sanitizeHtml(rawTitle).trim();
  const rawContent = String(
    record.content || record.description || record.summary || record.text || ''
  );
  const content = sanitizeHtml(rawContent);

  const userObj =
    typeof record.user === 'object' && record.user !== null
      ? (record.user as Record<string, unknown>)
      : null;
  const rawAuthor = record.author || record.creator || userObj?.name;
  const author = String(rawAuthor || 'Unknown').trim();

  let publishedAt = String(
    record.publishedAt || record.pubDate || record.date || record.created_at || ''
  );
  if (!publishedAt || Number.isNaN(Date.parse(publishedAt))) {
    publishedAt = new Date().toISOString();
  } else {
    publishedAt = new Date(publishedAt).toISOString();
  }

  const mediaUrls: string[] = Array.isArray(record.mediaUrls)
    ? record.mediaUrls.map(String)
    : Array.isArray(record.media)
    ? record.media.map(String)
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
