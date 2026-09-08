export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  let clean = html;

  // 1. Strip script, iframe, object, embed, applet, style, form tags & inner contents
  clean = clean.replace(/<\s*(script|iframe|object|embed|applet|style|form)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');

  // 2. Strip unclosed or self-closing dangerous tags
  clean = clean.replace(/<\s*\/?\s*(script|iframe|object|embed|applet|style|form)[^>]*?>/gi, '');

  // 3. Remove event handler attributes (onload, onerror, onclick, onmouseover, etc.)
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:["'][^"']*?["']|[^\s>]+)/gi, '');

  // 4. Neutralize javascript: and unsafe data: URIs in href or src attributes
  clean = clean.replace(/(href|src|action)\s*=\s*["']\s*(?:javascript|vbscript|data(?!\s*:\s*image\/)):[^"']*?["']/gi, '$1=""');
  clean = clean.replace(/(href|src|action)\s*=\s*(?:javascript|vbscript|data(?!\s*:\s*image\/)):[^\s>]+/gi, '$1=""');

  return clean;
}
