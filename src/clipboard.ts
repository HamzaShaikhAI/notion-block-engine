/**
 * High-Level Clipboard Integration Utilities
 * Handles parsing and formatting clipboard payloads between System Clipboard and Notion Block AST.
 */

import { NotionBlock, ClipboardPayload } from './types.js';
import { parseHtml } from './html-parser.js';
import { parseMarkdown } from './markdown-parser.js';
import { blocksToMarkdown } from './ast-to-markdown.js';
import { blocksToHtml } from './ast-to-html.js';

export interface RawClipboardData {
  html?: string | null;
  text?: string | null;
}

/**
 * Parses raw clipboard data into a normalized Notion Block AST.
 * Intelligently favors structured HTML if rich content is present, otherwise falls back to Markdown text.
 */
export function parseClipboard(data: RawClipboardData): NotionBlock[] {
  const html = data.html?.trim();
  const text = data.text?.trim();

  // If HTML contains semantic tags, parse as HTML
  if (html && (/<(?:p|h[1-6]|ul|ol|table|blockquote|pre|div|strong|em|a)\b/i.test(html))) {
    const blocks = parseHtml(html);
    if (blocks.length > 0) return blocks;
  }

  // Fallback to plain text / markdown
  if (text) {
    return parseMarkdown(text);
  }

  return [];
}

/**
 * Formats a Notion Block AST into dual clipboard payloads (Plain Text & Clean HTML)
 * so it can be pasted into any application seamlessly.
 */
export function formatClipboard(blocks: NotionBlock[]): ClipboardPayload {
  const text = blocksToMarkdown(blocks);
  const html = blocksToHtml(blocks);

  return {
    text,
    html,
    blocks,
  };
}
