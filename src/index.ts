/**
 * Notion Block Engine
 * Zero-dependency bidirectional Notion block AST, clipboard HTML sanitizer, and Markdown engine.
 */

export * from './types.js';
export { sanitizeClipboardHtml } from './html-sanitizer.js';
export { parseMarkdown, parseInlineRichText } from './markdown-parser.js';
export { parseHtml, parseHtmlInlineRichText } from './html-parser.js';
export { blocksToMarkdown, richTextToMarkdown } from './ast-to-markdown.js';
export { blocksToHtml, richTextToHtml } from './ast-to-html.js';
export { parseClipboard, formatClipboard, RawClipboardData } from './clipboard.js';

import { parseMarkdown } from './markdown-parser.js';
import { parseHtml } from './html-parser.js';
import { blocksToMarkdown } from './ast-to-markdown.js';
import { blocksToHtml } from './ast-to-html.js';
import { parseClipboard, formatClipboard, RawClipboardData } from './clipboard.js';
import { NotionBlock, ClipboardPayload } from './types.js';

export class NotionBlockEngine {
  /**
   * Parse GFM Markdown into a Notion Block AST
   */
  static fromMarkdown(markdown: string): NotionBlock[] {
    return parseMarkdown(markdown);
  }

  /**
   * Parse raw or dirty HTML into a Notion Block AST
   */
  static fromHtml(html: string): NotionBlock[] {
    return parseHtml(html);
  }

  /**
   * Parse raw clipboard payload (HTML & Text) into a Notion Block AST
   */
  static fromClipboard(data: RawClipboardData): NotionBlock[] {
    return parseClipboard(data);
  }

  /**
   * Convert Notion Block AST into clean GFM Markdown
   */
  static toMarkdown(blocks: NotionBlock[]): string {
    return blocksToMarkdown(blocks);
  }

  /**
   * Convert Notion Block AST into clean semantic HTML
   */
  static toHtml(blocks: NotionBlock[]): string {
    return blocksToHtml(blocks);
  }

  /**
   * Format Notion Block AST into dual clipboard payloads (HTML + Plaintext)
   */
  static toClipboard(blocks: NotionBlock[]): ClipboardPayload {
    return formatClipboard(blocks);
  }
}

export default NotionBlockEngine;
