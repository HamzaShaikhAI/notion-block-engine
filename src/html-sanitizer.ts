/**
 * Zero-dependency HTML Sanitizer & Normalizer for Dirty Clipboard Content
 * Strips Google Docs GUIDs, Microsoft Word Mso bloat, inline styling artifacts,
 * and converts them into standardized semantic HTML tags.
 */

export function sanitizeClipboardHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  let html = rawHtml;

  // 1. Remove meta tags, doctypes, head, comments
  html = html.replace(/<!DOCTYPE[^>]*>/gi, '');
  html = html.replace(/<meta[^>]*>/gi, '');
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // 2. Normalize Microsoft Word Mso bloat
  html = html.replace(/class="Mso[a-zA-Z0-9]+"/gi, '');
  html = html.replace(/style="[^"]*mso-[^"]*"/gi, '');

  // 3. Normalize Google Docs internal wrappers:
  // <b id="docs-internal-guid-..." style="font-weight:normal;">
  html = html.replace(/<b\s+id="docs-internal-guid-[^"]*"\s*[^>]*>([\s\S]*?)<\/b>/gi, '$1');

  // 4. Convert CSS font styles in spans into semantic tags:
  // bold: font-weight: 700 or font-weight: bold
  html = html.replace(/<span\s+style="[^"]*font-weight:\s*(?:700|bold)[^"]*">([\s\S]*?)<\/span>/gi, '<strong>$1</strong>');
  // italic: font-style: italic
  html = html.replace(/<span\s+style="[^"]*font-style:\s*italic[^"]*">([\s\S]*?)<\/span>/gi, '<em>$1</em>');
  // underline: text-decoration: underline
  html = html.replace(/<span\s+style="[^"]*text-decoration:\s*underline[^"]*">([\s\S]*?)<\/span>/gi, '<u>$1</u>');
  // strikethrough: text-decoration: line-through
  html = html.replace(/<span\s+style="[^"]*text-decoration:\s*line-through[^"]*">([\s\S]*?)<\/span>/gi, '<s>$1</s>');
  // code: font-family: monospace or consolas
  html = html.replace(/<span\s+style="[^"]*font-family:\s*(?:monospace|consolas|courier)[^"]*">([\s\S]*?)<\/span>/gi, '<code>$1</code>');

  // 5. Normalize entities
  html = html.replace(/&nbsp;/g, ' ');
  html = html.replace(/&amp;/g, '&');
  html = html.replace(/&lt;/g, '<');
  html = html.replace(/&gt;/g, '>');
  html = html.replace(/&quot;/g, '"');
  html = html.replace(/&#39;/g, "'");

  // 6. Clean empty paragraphs or duplicate breaks
  html = html.replace(/<p>\s*<\/p>/gi, '');
  html = html.replace(/(?:<br\s*\/?>\s*){3,}/gi, '<br><br>');

  return html.trim();
}
