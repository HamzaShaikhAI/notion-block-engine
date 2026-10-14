/**
 * Fast, Zero-Dependency GFM & Markdown to Notion Block AST Parser
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
  EquationBlock,
  BookmarkBlock,
  RichTextItem,
  Annotations,
} from './types.js';

export function parseInlineRichText(text: string): RichTextItem[] {
  if (!text) return [];

  const items: RichTextItem[] = [];
  let remaining = text;

  // Regex pattern matching inline formats:
  // 1: Link [text](url)
  // 2: Bold+Italic ***text*** or ___text___
  // 3: Bold **text** or __text__
  // 4: Italic *text* or _text_
  // 5: Strikethrough ~~text~~
  // 6: Inline code `text`
  // 7: Inline equation $text$
  const tokenRegex =
    /(\[(.+?)\]\((https?:\/\/[^\s)]+)\))|(\*\*\*(.+?)\*\*\*|___(.+?)___)|(\*\*(.+?)\*\*|__(.+?)__)|(\*(.+?)\*|_(.+?)_)|(~~(.+?)~~)|(`(.+?)`)|(\$([^$\n]+)\$)/;

  while (remaining.length > 0) {
    const match = tokenRegex.exec(remaining);

    if (!match) {
      // No more tokens, rest is plain text
      items.push(createPlainTextItem(remaining));
      break;
    }

    const index = match.index;
    if (index > 0) {
      items.push(createPlainTextItem(remaining.slice(0, index)));
    }

    const fullMatch = match[0];

    if (match[1]) {
      // Link: [text](url)
      const linkText = match[2];
      const linkUrl = match[3];
      items.push({
        type: 'text',
        text: {
          content: linkText,
          link: { url: linkUrl },
        },
        plain_text: linkText,
        href: linkUrl,
        annotations: { ...defaultAnnotations },
      });
    } else if (match[4]) {
      // Bold + Italic: ***text***
      const content = match[5] || match[6];
      items.push(createStyledItem(content, { bold: true, italic: true }));
    } else if (match[7]) {
      // Bold: **text**
      const content = match[8] || match[9];
      items.push(createStyledItem(content, { bold: true }));
    } else if (match[10]) {
      // Italic: *text*
      const content = match[11] || match[12];
      items.push(createStyledItem(content, { italic: true }));
    } else if (match[13]) {
      // Strikethrough: ~~text~~
      const content = match[14];
      items.push(createStyledItem(content, { strikethrough: true }));
    } else if (match[15]) {
      // Inline Code: `code`
      const content = match[16];
      items.push(createStyledItem(content, { code: true }));
    } else if (match[17]) {
      // Inline Equation: $math$
      const expr = match[18];
      items.push({
        type: 'equation',
        equation: { expression: expr },
        plain_text: expr,
        annotations: { ...defaultAnnotations },
      });
    }

    remaining = remaining.slice(index + fullMatch.length);
  }

  return items;
}

const defaultAnnotations: Annotations = {
  bold: false,
  italic: false,
  strikethrough: false,
  underline: false,
  code: false,
  color: 'default',
};

function createPlainTextItem(content: string): RichTextItem {
  return {
    type: 'text',
    text: { content },
    plain_text: content,
    annotations: { ...defaultAnnotations },
  };
}

function createStyledItem(
  content: string,
  annotations: Partial<Annotations>,
): RichTextItem {
  return {
    type: 'text',
    text: { content },
    plain_text: content,
    annotations: {
      ...defaultAnnotations,
      ...annotations,
    },
  };
}

export function parseMarkdown(markdown: string): NotionBlock[] {
  if (!markdown || typeof markdown !== 'string') return [];

  const lines = markdown.split(/\r?\n/);
  const blocks: NotionBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // 1. Code block fence (```)
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume closing ```

      const codeBlock: CodeBlock = {
        type: 'code',
        code: {
          rich_text: [createPlainTextItem(codeLines.join('\n'))],
          language: lang || 'plain text',
        },
      };
      blocks.push(codeBlock);
      continue;
    }

    // 2. Math block ($$)
    if (trimmed.startsWith('$$')) {
      if (trimmed.endsWith('$$') && trimmed.length > 2) {
        // Single line math block
        const expr = trimmed.slice(2, -2).trim();
        blocks.push({
          type: 'equation',
          equation: { expression: expr },
        });
        i++;
        continue;
      }
      const mathLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().endsWith('$$')) {
        mathLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume closing $$

      blocks.push({
        type: 'equation',
        equation: { expression: mathLines.join('\n').trim() },
      });
      continue;
    }

    // 3. Headings (#, ##, ###)
    if (line.startsWith('# ')) {
      blocks.push({
        type: 'heading_1',
        heading_1: { rich_text: parseInlineRichText(line.slice(2)) },
      });
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({
        type: 'heading_2',
        heading_2: { rich_text: parseInlineRichText(line.slice(3)) },
      });
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      blocks.push({
        type: 'heading_3',
        heading_3: { rich_text: parseInlineRichText(line.slice(4)) },
      });
      i++;
      continue;
    }

    // 4. Divider (---, ***, ___)
    if (/^([-*_]){3,}$/.test(trimmed)) {
      blocks.push({
        type: 'divider',
        divider: {},
      });
      i++;
      continue;
    }

    // 5. To-Do (- [ ] or - [x])
    const todoMatch = /^[-*]\s+\[([ xX])\]\s+(.*)$/.exec(trimmed);
    if (todoMatch) {
      const checked = todoMatch[1].toLowerCase() === 'x';
      blocks.push({
        type: 'to_do',
        to_do: {
          rich_text: parseInlineRichText(todoMatch[2]),
          checked,
        },
      });
      i++;
      continue;
    }

    // 6. Bullet list (- or *)
    const bulletMatch = /^[-*]\s+(.*)$/.exec(trimmed);
    if (bulletMatch) {
      blocks.push({
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: parseInlineRichText(bulletMatch[1]),
        },
      });
      i++;
      continue;
    }

    // 7. Numbered list (1. 2. etc.)
    const numMatch = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (numMatch) {
      blocks.push({
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: parseInlineRichText(numMatch[1]),
        },
      });
      i++;
      continue;
    }

    // 8. Callouts & Quotes (> [!NOTE] or > text)
    if (trimmed.startsWith('>')) {
      const quoteContent = trimmed.replace(/^>\s*/, '');

      // Check for GFM alert: > [!NOTE] / > [!TIP] / > [!WARNING] etc.
      const alertMatch = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i.exec(
        quoteContent,
      );
      if (alertMatch) {
        const alertType = alertMatch[1].toUpperCase();
        const alertText = alertMatch[2];
        const emojiMap: Record<string, string> = {
          NOTE: 'ℹ️',
          TIP: '💡',
          IMPORTANT: '❗',
          WARNING: '⚠️',
          CAUTION: '🛑',
        };
        blocks.push({
          type: 'callout',
          callout: {
            rich_text: parseInlineRichText(alertText),
            icon: { type: 'emoji', emoji: emojiMap[alertType] || '💡' },
          },
        });
        i++;
        continue;
      }

      // Check for emoji callout: > 💡 text
      const emojiMatch = /^([\p{Emoji}\u2600-\u27BF])\s+(.*)$/u.exec(
        quoteContent,
      );
      if (emojiMatch) {
        blocks.push({
          type: 'callout',
          callout: {
            rich_text: parseInlineRichText(emojiMatch[2]),
            icon: { type: 'emoji', emoji: emojiMatch[1] },
          },
        });
        i++;
        continue;
      }

      // Standard quote block
      blocks.push({
        type: 'quote',
        quote: { rich_text: parseInlineRichText(quoteContent) },
      });
      i++;
      continue;
    }

    // 9. Markdown Table (| Col 1 | Col 2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableRows: TableRowBlock[] = [];
      let hasHeader = false;

      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const rowLine = lines[i].trim();
        // Check if this is the separator row (| --- | --- |)
        if (/^\|(?:\s*:?-+:?\s*\|)+$/.test(rowLine)) {
          hasHeader = true;
          i++;
          continue;
        }

        const rawCells = rowLine
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        const cells: RichTextItem[][] = rawCells.map((c) =>
          parseInlineRichText(c),
        );

        tableRows.push({
          type: 'table_row',
          table_row: { cells },
        });
        i++;
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
      continue;
    }

    // 10. Toggle block (<details><summary>Title</summary>Content</details>)
    if (trimmed.startsWith('<details>')) {
      let title = 'Toggle';
      const summaryMatch = /<summary>(.*?)<\/summary>/i.exec(trimmed);
      if (summaryMatch) {
        title = summaryMatch[1];
      }
      blocks.push({
        type: 'toggle',
        toggle: {
          rich_text: parseInlineRichText(title),
        },
      });
      i++;
      continue;
    }

    // 11. Standalone URL as Bookmark
    if (/^https?:\/\/[^\s]+$/.test(trimmed)) {
      blocks.push({
        type: 'bookmark',
        bookmark: { url: trimmed },
      });
      i++;
      continue;
    }

    // 12. Default: Paragraph block
    blocks.push({
      type: 'paragraph',
      paragraph: {
        rich_text: parseInlineRichText(line),
      },
    });
    i++;
  }

  return blocks;
}
