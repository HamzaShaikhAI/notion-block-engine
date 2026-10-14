/**
 * Serializes Notion Block AST back into Clean GitHub Flavored Markdown (GFM)
 */

import { NotionBlock, RichTextItem } from './types.js';

export function richTextToMarkdown(items: RichTextItem[]): string {
  if (!items || items.length === 0) return '';

  return items
    .map((item) => {
      let text = item.plain_text || item.text?.content || '';

      if (item.type === 'equation') {
        return `$${item.equation?.expression || text}$`;
      }

      const { bold, italic, strikethrough, code } = item.annotations || {};

      if (code) {
        text = `\`${text}\``;
      }
      if (bold && italic) {
        text = `***${text}***`;
      } else if (bold) {
        text = `**${text}**`;
      } else if (italic) {
        text = `*${text}*`;
      }
      if (strikethrough) {
        text = `~~${text}~~`;
      }

      if (item.href || item.text?.link?.url) {
        const url = item.href || item.text?.link?.url;
        text = `[${text}](${url})`;
      }

      return text;
    })
    .join('');
}

export function blocksToMarkdown(blocks: NotionBlock[]): string {
  if (!blocks || blocks.length === 0) return '';

  const output: string[] = [];
  let numberedListIndex = 1;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    switch (block.type) {
      case 'heading_1':
        output.push(`# ${richTextToMarkdown(block.heading_1.rich_text)}`);
        numberedListIndex = 1;
        break;
      case 'heading_2':
        output.push(`## ${richTextToMarkdown(block.heading_2.rich_text)}`);
        numberedListIndex = 1;
        break;
      case 'heading_3':
        output.push(`### ${richTextToMarkdown(block.heading_3.rich_text)}`);
        numberedListIndex = 1;
        break;
      case 'paragraph':
        output.push(richTextToMarkdown(block.paragraph.rich_text));
        numberedListIndex = 1;
        break;
      case 'bulleted_list_item':
        output.push(`- ${richTextToMarkdown(block.bulleted_list_item.rich_text)}`);
        numberedListIndex = 1;
        break;
      case 'numbered_list_item':
        output.push(`${numberedListIndex}. ${richTextToMarkdown(block.numbered_list_item.rich_text)}`);
        numberedListIndex++;
        break;
      case 'to_do':
        output.push(`- [${block.to_do.checked ? 'x' : ' '}] ${richTextToMarkdown(block.to_do.rich_text)}`);
        numberedListIndex = 1;
        break;
      case 'quote':
        output.push(`> ${richTextToMarkdown(block.quote.rich_text)}`);
        numberedListIndex = 1;
        break;
      case 'callout': {
        const emoji = block.callout.icon?.emoji ? `${block.callout.icon.emoji} ` : '💡 ';
        output.push(`> ${emoji}${richTextToMarkdown(block.callout.rich_text)}`);
        numberedListIndex = 1;
        break;
      }
      case 'code': {
        const lang = block.code.language === 'plain text' ? '' : block.code.language;
        const codeText = block.code.rich_text.map((r) => r.plain_text).join('');
        output.push(`\`\`\`${lang}\n${codeText}\n\`\`\``);
        numberedListIndex = 1;
        break;
      }
      case 'divider':
        output.push('---');
        numberedListIndex = 1;
        break;
      case 'equation':
        output.push(`$$\n${block.equation.expression}\n$$`);
        numberedListIndex = 1;
        break;
      case 'bookmark':
        output.push(block.bookmark.url);
        numberedListIndex = 1;
        break;
      case 'image':
        output.push(`![Image](${block.image.external.url})`);
        numberedListIndex = 1;
        break;
      case 'toggle':
        output.push(`<details>\n<summary>${richTextToMarkdown(block.toggle.rich_text)}</summary>\n</details>`);
        numberedListIndex = 1;
        break;
      case 'table': {
        if (block.children && block.children.length > 0) {
          const rows = block.children;
          const tableLines: string[] = [];

          for (let r = 0; r < rows.length; r++) {
            const cells = rows[r].table_row.cells;
            const line = `| ${cells.map((c) => richTextToMarkdown(c)).join(' | ')} |`;
            tableLines.push(line);

            if (r === 0 && block.table.has_column_header) {
              const sep = `| ${cells.map(() => '---').join(' | ')} |`;
              tableLines.push(sep);
            }
          }
          output.push(tableLines.join('\n'));
        }
        numberedListIndex = 1;
        break;
      }
    }
  }

  return output.join('\n\n');
}
