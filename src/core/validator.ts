import { InternalPost } from './types';
import { isSafeUrl } from '../security/ssrf';

export function validatePost(post: unknown): post is InternalPost {
  if (!post || typeof post !== 'object') return false;
  const p = post as Record<string, unknown>;

  if (typeof p.id !== 'string' || !p.id.trim()) return false;
  if (typeof p.url !== 'string' || !p.url.trim()) return false;
  if (typeof p.title !== 'string' || !p.title.trim()) return false;
  if (typeof p.content !== 'string') return false;
  if (typeof p.author !== 'string') return false;
  if (typeof p.publishedAt !== 'string' || Number.isNaN(Date.parse(p.publishedAt))) return false;

  // Validate URL scheme and SSRF protection
  if (!isSafeUrl(p.url)) {
    return false;
  }

  return true;
}
