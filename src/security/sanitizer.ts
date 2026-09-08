function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  let prev = '';
  let curr = str;
  let iterations = 0;
  while (curr !== prev && iterations < 3) {
    prev = curr;
    curr = curr
      .replace(/&#x([0-9a-fA-F]+);?/gi, (_, hex) => {
        try {
          return String.fromCharCode(parseInt(hex, 16));
        } catch {
          return '';
        }
      })
      .replace(/&#([0-9]+);?/g, (_, dec) => {
        try {
          return String.fromCharCode(parseInt(dec, 10));
        } catch {
          return '';
        }
      })
      .replace(/&colon;/gi, ':')
      .replace(/&tab;/gi, '\t')
      .replace(/&newline;/gi, '\n')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
    iterations++;
  }
  return curr;
}

export function isUnsafeUri(uri: string): boolean {
  if (!uri || typeof uri !== 'string') return false;

  const decoded = decodeHtmlEntities(uri);
  // Remove control characters (ASCII 0-31, 127-159) and whitespace
  const normalized = decoded.replace(/[\x00-\x1F\x7F-\x9F\s]/g, '').toLowerCase();

  const firstColon = normalized.indexOf(':');
  if (firstColon === -1) {
    return false;
  }

  const firstSlash = normalized.indexOf('/');
  const firstQuestion = normalized.indexOf('?');
  const firstHash = normalized.indexOf('#');

  if (
    (firstSlash !== -1 && firstSlash < firstColon) ||
    (firstQuestion !== -1 && firstQuestion < firstColon) ||
    (firstHash !== -1 && firstHash < firstColon)
  ) {
    return false;
  }

  const scheme = normalized.substring(0, firstColon);

  if (scheme === 'javascript' || scheme === 'vbscript') {
    return true;
  }

  if (scheme === 'data') {
    const isSafeImageData = /^data:image\/(png|jpg|jpeg|gif|webp|apng|avif);base64,/i.test(normalized);
    return !isSafeImageData;
  }

  return false;
}

export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  let clean = html;

  // 1. Strip script, iframe, object, embed, applet, style, form tags & inner contents
  clean = clean.replace(/<\s*(script|iframe|object|embed|applet|style|form)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');

  // 2. Strip unclosed or self-closing dangerous tags
  clean = clean.replace(/<\s*\/?\s*(script|iframe|object|embed|applet|style|form)[^>]*?>/gi, '');

  // 3. Remove event handler attributes (onload, onerror, onclick, onmouseover, etc.)
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:["'][^"']*?["']|[^\s>]+)/gi, '');

  // 4. Neutralize dangerous URIs in attributes
  clean = clean.replace(/(href|src|action|formaction|poster|data|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi, (match, attr, q2, q3, q4) => {
    const val = q2 ?? q3 ?? q4 ?? '';
    if (isUnsafeUri(val)) {
      return `${attr}=""`;
    }
    return match;
  });

  return clean;
}
