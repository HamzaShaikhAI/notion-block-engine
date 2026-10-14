/**
 * Zero-Dependency HTML to Notion Block AST Parser
 * Converts sanitized semantic HTML structures into full Notion Blocks with rich text annotations.
 */

import {
  NotionBlock,
  ParagraphBlock,
  Heading1Block,
  Heading2Block,
  Heading3Block,
  BulletedListItemBlock,
  NumberedListItemBlock,
  ToDoBlock,
  ToggleBlock,
  CodeBlock,
  QuoteBlock,
  CalloutBlock,
  DividerBlock,
  TableBlock,
  TableRowBlock,
  RichTextItem,
  Annotations,
} from './types.js';
import { sanitizeClipboardHtml } from './html-sanitizer.js';

export function parseHtmlInlineRichText(html: string): RichTextItem[] {
  if (!html) return [];

  const items: RichTextItem[] = [];
  // Tokenize HTML tags and text content
  const tagRegex = /(<(\/?[a-zA-Z0-9]+)([^>]*)>)|([^<]+)/g;
  let match: RegExpExecArray | null;

  const styleStack: Partial<Annotations>[] = [];
  let currentLink: string | null = null;

  while ((match = tagRegex.exec(html)) !== null) {
    if (match[4]) {
      // Text node
      const text = match[4];
      if (text.length > 0) {
        const mergedAnnotations: Annotations = {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        };

        for (const style of styleStack) {
          Object.assign(mergedAnnotations, style);
        }

        items.push({
          type: 'text',
          text: {
            content: text,
            link: currentLink ? { url: currentLink } : null,
          },
          plain_text: text,
          href: currentLink,
          annotations: mergedAnnotations,
        });
      }
    } else if (match[1]) {
      // Tag
      const isClosing = match[2].startsWith('/');
      const tagName = (isClosing ? match[2].slice(1) : match[2]).toLowerCase();
      const attributes = match[3] || '';

      if (isClosing) {
        if (tagName === 'a') {
          currentLink = null;
        } else {
          styleStack.pop();
        }
      } else {
        // Opening tag
        switch (tagName) {
          case 'strong':
          case 'b':
            styleStack.push({ bold: true });
            break;
          case 'em':
          case 'i':
            styleStack.push({ italic: true });
            break;
          case 's':
          case 'strike':
          case 'del':
            styleStack.push({ strikethrough: true });
            break;
          case 'u':
            styleStack.push({ underline: true });
            break;
          case 'code':
            styleStack.push({ code: true });
            break;
          case 'a': {
            const hrefMatch = /href="([^"]+)"/i.exec(attributes);
            if (hrefMatch) {
              currentLink = hrefMatch[1];
            }
            break;
          }
          default:
            // Generic tag, neutral
            break;
        }
      }
    }
  }

  return items;
}

export function parseHtml(rawHtml: string): NotionBlock[] {
  if (!rawHtml || typeof rawHtml !== 'string') return [];

  const sanitized = sanitizeClipboardHtml(rawHtml);
  const blocks: NotionBlock[] = [];

  // Match top-level blocks: <p>, <h1>-<h3>, <ul>, <ol>, <pre>, <blockquote>, <hr>, <table>, <details>
  const blockRegex =
    /<(h[1-3]|p|pre|blockquote|ul|ol|hr|table|details)[^>]*>([\s\S]*?)<\/\1>|<(hr)[^>]*\/?>/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(sanitized)) !== null) {
    const tagName = (match[1] || match[3] || '').toLowerCase();
    const innerHtml = match[2] || '';

    switch (tagName) {
      case 'h1':
        blocks.push({
          type: 'heading_1',
          heading_1: { rich_text: parseHtmlInlineRichText(innerHtml) },
        });
        break;
      case 'h2':
        blocks.push({
          type: 'heading_2',
          heading_2: { rich_text: parseHtmlInlineRichText(innerHtml) },
        });
        break;
      case 'h3':
        blocks.push({
          type: 'heading_3',
          heading_3: { rich_text: parseHtmlInlineRichText(innerHtml) },
        });
        break;
      case 'p':
        blocks.push({
          type: 'paragraph',
          paragraph: { rich_text: parseHtmlInlineRichText(innerHtml) },
        });
        break;
      case 'pre': {
        // Extract language from <code class="language-xyz"> if present
        let lang = 'plain text';
        let codeContent = innerHtml;
        const codeMatch = /<code(?:\s+class="language-([a-zA-Z0-9_-]+)")?[^>]*>([\s\S]*?)<\/code>/i.exec(
          innerHtml,
        );
        if (codeMatch) {
          if (codeMatch[1]) lang = codeMatch[1];
          codeContent = codeMatch[2];
        }
        // Strip tags inside code
        const plainCode = codeContent.replace(/<[^>]+>/g, '');
        blocks.push({
          type: 'code',
          code: {
            rich_text: [
              {
                type: 'text',
                text: { content: plainCode },
                plain_text: plainCode,
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: 'default',
                },
              },
            ],
            language: lang,
          },
        });
        break;
      }
      case 'blockquote': {
        // Detect callout or quote
        const text = innerHtml.replace(/<[^>]+>/g, '').trim();
        const emojiMatch = /^([\p{Emoji}\u2600-\u27BF])\s*(.*)$/u.exec(text);
        if (emojiMatch) {
          blocks.push({
            type: 'callout',
            callout: {
              rich_text: parseHtmlInlineRichText(emojiMatch[2]),
              icon: { type: 'emoji', emoji: emojiMatch[1] },
            },
          });
        } else {
          blocks.push({
            type: 'quote',
            quote: { rich_text: parseHtmlInlineRichText(innerHtml) },
          });
        }
        break;
      }
      case 'ul': {
        const liMatches = innerHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
        for (const li of liMatches) {
          const liInner = li.replace(/^<li[^>]*>/i, '').replace(/<\/li>$/i, '');
          // Check for checkbox in to_do: <input type="checkbox" checked>
          const isChecklist = /<input[^>]*type="checkbox"[^>]*>/i.test(liInner);
          if (isChecklist) {
            const isChecked = /checked/i.test(liInner);
            const cleanText = liInner.replace(/<input[^>]*>/i, '');
            blocks.push({
              type: 'to_do',
              to_do: {
                rich_text: parseHtmlInlineRichText(cleanText),
                checked: isChecked,
              },
            });
          } else {
            blocks.push({
              type: 'bulleted_list_item',
              bulleted_list_item: {
                rich_text: parseHtmlInlineRichText(liInner),
              },
            });
          }
        }
        break;
      }
      case 'ol': {
        const liMatches = innerHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
        for (const li of liMatches) {
          const liInner = li.replace(/^<li[^>]*>/i, '').replace(/<\/li>$/i, '');
          blocks.push({
            type: 'numbered_list_item',
            numbered_list_item: {
              rich_text: parseHtmlInlineRichText(liInner),
            },
          });
        }
        break;
      }
      case 'hr':
        blocks.push({
          type: 'divider',
          divider: {},
        });
        break;
      case 'table': {
        const trMatches =
          innerHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
        const tableRows: TableRowBlock[] = [];
        let hasHeader = false;

        for (const tr of trMatches) {
          const isTh = /<th[^>]*>/i.test(tr);
          if (isTh) hasHeader = true;

          const cellMatches =
            tr.match(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi) || [];
          const cells: RichTextItem[][] = cellMatches.map((cell) => {
            const cellInner = cell
              .replace(/^<(?:td|th)[^>]*>/i, '')
              .replace(/<\/(?:td|th)>$/i, '');
            return parseHtmlInlineRichText(cellInner);
          });

          if (cells.length > 0) {
            tableRows.push({
              type: 'table_row',
              table_row: { cells },
            });
          }
        }

        if (tableRows.length > 0) {
          blocks.push({
            type: 'table',
            table: {
              table_width: tableRows[0].table_row.cells.length,
              has_column_header: hasHeader,
              has_row_header: false,
            },
            children: tableRows,
          });
        }
        break;
      }
      case 'details': {
        const summaryMatch = /<summary[^>]*>([\s\S]*?)<\/summary>/i.exec(
          innerHtml,
        );
        const title = summaryMatch ? summaryMatch[1] : 'Toggle';
        blocks.push({
          type: 'toggle',
          toggle: {
            rich_text: parseHtmlInlineRichText(title),
          },
        });
        break;
      }
    }

    lastIndex = blockRegex.lastIndex;
  }

  // Fallback: If no top-level blocks matched, treat entire string as paragraph
  if (blocks.length === 0 && sanitized.trim().length > 0) {
    blocks.push({
      type: 'paragraph',
      paragraph: {
        rich_text: parseHtmlInlineRichText(sanitized),
      },
    });
  }

  return blocks;
}
