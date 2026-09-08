import { InternalPost } from './types';

export function validatePost(post: unknown): post is InternalPost {
  if (!post || typeof post !== 'object') return false;
  const p = post as Record<string, unknown>;

  if (typeof p.id !== 'string' || !p.id.trim()) return false;
  if (typeof p.url !== 'string' || !p.url.trim()) return false;
  if (typeof p.title !== 'string' || !p.title.trim()) return false;
  if (typeof p.content !== 'string') return false;
  if (typeof p.author !== 'string') return false;
  if (typeof p.publishedAt !== 'string' || Number.isNaN(Date.parse(p.publishedAt))) return false;

  // SSRF / Scheme check for URL
  try {
    const u = new URL(p.url);
    if (!['http:', 'https:'].includes(u.protocol)) {
      return false;
    }
    // Block localhost / private IP ranges in production/strict mode
    const hostname = u.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.endsWith('.internal')
    ) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}
