export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  // Remove script, iframe, object, embed tags and their content
  let clean = html.replace(/<\s*(script|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  
  // Remove self-closing or unclosed unsafe tags
  clean = clean.replace(/<\s*\/?\s*(script|iframe|object|embed)[^>]*?>/gi, '');
  
  // Remove event handlers (onload, onerror, onclick, etc.)
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:["'][^"']*?["']|[^\s>]+)/gi, '');
  
  // Remove javascript: and unsafe data: URIs in href/src
  clean = clean.replace(/(href|src)\s*=\s*(?:["']\s*javascript:[^"']*?["']|javascript:[^\s>]+)/gi, '$1=""');

  return clean;
}
