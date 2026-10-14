/**
 * Serializes Notion Block AST into Clean Semantic HTML
 */

import { NotionBlock, RichTextItem } from './types.js';

export function richTextToHtml(items: RichTextItem[]): string {
  if (!items || items.length === 0) return '';

  return items
    .map((item) => {
      let text = escapeHtml(item.plain_text || item.text?.content || '');

      if (item.type === 'equation') {
        return `<span class="notion-equation" data-expr="${escapeHtml(item.equation?.expression || '')}">$${text}$</span>`;
      }

      const { bold, italic, strikethrough, underline, code, color } = item.annotations || {};

      if (code) text = `<code>${text}</code>`;
      if (bold) text = `<strong>${text}</strong>`;
      if (italic) text = `<em>${text}</em>`;
      if (underline) text = `<u>${text}</u>`;
      if (strikethrough) text = `<s>${text}</s>`;

      if (color && color !== 'default') {
        text = `<span class="notion-color-${color}">${text}</span>`;
      }

      if (item.href || item.text?.link?.url) {
        const url = item.href || item.text?.link?.url || '';
        text = `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      }

      return text;
    })
    .join('');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function blocksToHtml(blocks: NotionBlock[]): string {
  if (!blocks || blocks.length === 0) return '';

  const html: string[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    switch (block.type) {
      case 'heading_1':
        html.push(`<h1>${richTextToHtml(block.heading_1.rich_text)}</h1>`);
        break;
      case 'heading_2':
        html.push(`<h2>${richTextToHtml(block.heading_2.rich_text)}</h2>`);
        break;
      case 'heading_3':
        html.push(`<h3>${richTextToHtml(block.heading_3.rich_text)}</h3>`);
        break;
      case 'paragraph':
        html.push(`<p>${richTextToHtml(block.paragraph.rich_text)}</p>`);
        break;
      case 'bulleted_list_item':
        html.push(`<ul><li>${richTextToHtml(block.bulleted_list_item.rich_text)}</li></ul>`);
        break;
      case 'numbered_list_item':
        html.push(`<ol><li>${richTextToHtml(block.numbered_list_item.rich_text)}</li></ol>`);
        break;
      case 'to_do': {
        const checked = block.to_do.checked ? ' checked disabled' : ' disabled';
        html.push(
          `<div class="notion-to-do"><input type="checkbox"${checked} /><span>${richTextToHtml(block.to_do.rich_text)}</span></div>`,
        );
        break;
      }
      case 'quote':
        html.push(`<blockquote>${richTextToHtml(block.quote.rich_text)}</blockquote>`);
        break;
      case 'callout': {
        const emoji = block.callout.icon?.emoji || '💡';
        html.push(
          `<div class="notion-callout"><span class="notion-callout-icon">${emoji}</span><div class="notion-callout-text">${richTextToHtml(block.callout.rich_text)}</div></div>`,
        );
        break;
      }
      case 'code': {
        const lang = block.code.language === 'plain text' ? '' : ` class="language-${escapeHtml(block.code.language)}"`;
        const codeText = block.code.rich_text.map((r) => escapeHtml(r.plain_text)).join('');
        html.push(`<pre><code${lang}>${codeText}</code></pre>`);
        break;
      }
      case 'divider':
        html.push('<hr />');
        break;
      case 'equation':
        html.push(`<div class="notion-equation-block">$$\n${escapeHtml(block.equation.expression)}\n$$</div>`);
        break;
      case 'bookmark':
        html.push(`<div class="notion-bookmark"><a href="${escapeHtml(block.bookmark.url)}">${escapeHtml(block.bookmark.url)}</a></div>`);
        break;
      case 'image':
        html.push(`<img src="${escapeHtml(block.image.external.url)}" alt="Image" />`);
        break;
      case 'toggle':
        html.push(`<details><summary>${richTextToHtml(block.toggle.rich_text)}</summary></details>`);
        break;
      case 'table': {
        if (block.children && block.children.length > 0) {
          const rows = block.children;
          let tableHtml = '<table class="notion-table">';
          for (let r = 0; r < rows.length; r++) {
            tableHtml += '<tr>';
            const cells = rows[r].table_row.cells;
            const tag = r === 0 && block.table.has_column_header ? 'th' : 'td';
            for (const cell of cells) {
              tableHtml += `<${tag}>${richTextToHtml(cell)}</${tag}>`;
            }
            tableHtml += '</tr>';
          }
          tableHtml += '</table>';
          html.push(tableHtml);
        }
        break;
      }
    }
  }

  return html.join('\n');
}
