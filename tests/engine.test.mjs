import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NotionBlockEngine, sanitizeClipboardHtml, parseMarkdown, parseHtml, blocksToMarkdown, blocksToHtml } from '../dist/index.js';

describe('NotionBlockEngine Tests', () => {
  describe('Markdown Parsing to Notion Blocks', () => {
    it('should parse headings', () => {
      const md = '# Main Title\n\n## Sub Title\n\n### Section Title';
      const blocks = NotionBlockEngine.fromMarkdown(md);

      assert.equal(blocks.length, 3);
      assert.equal(blocks[0].type, 'heading_1');
      assert.equal(blocks[0].heading_1.rich_text[0].plain_text, 'Main Title');

      assert.equal(blocks[1].type, 'heading_2');
      assert.equal(blocks[1].heading_2.rich_text[0].plain_text, 'Sub Title');

      assert.equal(blocks[2].type, 'heading_3');
      assert.equal(blocks[2].heading_3.rich_text[0].plain_text, 'Section Title');
    });

    it('should parse checklists / to-dos', () => {
      const md = '- [ ] Unchecked item\n- [x] Completed item';
      const blocks = NotionBlockEngine.fromMarkdown(md);

      assert.equal(blocks.length, 2);
      assert.equal(blocks[0].type, 'to_do');
      assert.equal(blocks[0].to_do.checked, false);
      assert.equal(blocks[0].to_do.rich_text[0].plain_text, 'Unchecked item');

      assert.equal(blocks[1].type, 'to_do');
      assert.equal(blocks[1].to_do.checked, true);
      assert.equal(blocks[1].to_do.rich_text[0].plain_text, 'Completed item');
    });

    it('should parse code blocks with language', () => {
      const md = '```typescript\nconst x: number = 42;\nconsole.log(x);\n```';
      const blocks = NotionBlockEngine.fromMarkdown(md);

      assert.equal(blocks.length, 1);
      assert.equal(blocks[0].type, 'code');
      assert.equal(blocks[0].code.language, 'typescript');
      assert.ok(blocks[0].code.rich_text[0].plain_text.includes('const x: number = 42;'));
    });

    it('should parse callouts (GFM alert style)', () => {
      const md = '> [!TIP] Use keyboard shortcuts for 10x productivity';
      const blocks = NotionBlockEngine.fromMarkdown(md);

      assert.equal(blocks.length, 1);
      assert.equal(blocks[0].type, 'callout');
      assert.equal(blocks[0].callout.icon.emoji, '💡');
      assert.equal(blocks[0].callout.rich_text[0].plain_text, 'Use keyboard shortcuts for 10x productivity');
    });

    it('should parse inline formatting: bold, italic, code, links', () => {
      const md = 'This has **bold**, *italic*, `code`, and [link](https://github.com)';
      const blocks = NotionBlockEngine.fromMarkdown(md);

      assert.equal(blocks.length, 1);
      const spans = blocks[0].paragraph.rich_text;
      
      const boldSpan = spans.find((s) => s.plain_text === 'bold');
      assert.ok(boldSpan?.annotations.bold);

      const italicSpan = spans.find((s) => s.plain_text === 'italic');
      assert.ok(italicSpan?.annotations.italic);

      const codeSpan = spans.find((s) => s.plain_text === 'code');
      assert.ok(codeSpan?.annotations.code);

      const linkSpan = spans.find((s) => s.plain_text === 'link');
      assert.equal(linkSpan?.href, 'https://github.com');
    });

    it('should parse markdown tables', () => {
      const md = '| Feature | Support |\n| --- | --- |\n| Callouts | Yes |\n| Tables | Yes |';
      const blocks = NotionBlockEngine.fromMarkdown(md);

      assert.equal(blocks.length, 1);
      assert.equal(blocks[0].type, 'table');
      assert.equal(blocks[0].table.has_column_header, true);
      assert.equal(blocks[0].children.length, 3);
    });

    it('should parse KaTeX math equations', () => {
      const md = '$$\nE = mc^2\n$$';
      const blocks = NotionBlockEngine.fromMarkdown(md);

      assert.equal(blocks.length, 1);
      assert.equal(blocks[0].type, 'equation');
      assert.equal(blocks[0].equation.expression, 'E = mc^2');
    });
  });

  describe('Dirty HTML Sanitization & Parsing (Clipboard Emulation)', () => {
    it('should clean Google Docs dirty wrapper and spans', () => {
      const googleDocsHtml = `
        <meta charset="utf-8">
        <b id="docs-internal-guid-12345-abcd" style="font-weight:normal;">
          <p><span style="font-weight:700;">Bold from Docs</span> and <span style="font-style:italic;">Italic text</span></p>
        </b>
      `;
      const blocks = NotionBlockEngine.fromHtml(googleDocsHtml);

      assert.equal(blocks.length, 1);
      assert.equal(blocks[0].type, 'paragraph');
      const spans = blocks[0].paragraph.rich_text;
      const boldSpan = spans.find((s) => s.plain_text.includes('Bold from Docs'));
      assert.ok(boldSpan?.annotations.bold);
    });

    it('should clean Microsoft Word Mso bloat', () => {
      const msWordHtml = `
        <!--[if gte mso 9]><xml><w:WordDocument></w:WordDocument></xml><![endif]-->
        <p class="MsoNormal" style="mso-margin-top-alt:auto;">Hello from Word Document</p>
      `;
      const blocks = NotionBlockEngine.fromHtml(msWordHtml);

      assert.equal(blocks.length, 1);
      assert.equal(blocks[0].type, 'paragraph');
      assert.equal(blocks[0].paragraph.rich_text[0].plain_text, 'Hello from Word Document');
    });

    it('should parse HTML lists and tables', () => {
      const html = `
        <ul>
          <li>Bullet 1</li>
          <li>Bullet 2</li>
        </ul>
        <table>
          <tr><th>Header</th></tr>
          <tr><td>Value</td></tr>
        </table>
      `;
      const blocks = NotionBlockEngine.fromHtml(html);

      assert.equal(blocks.length, 3);
      assert.equal(blocks[0].type, 'bulleted_list_item');
      assert.equal(blocks[1].type, 'bulleted_list_item');
      assert.equal(blocks[2].type, 'table');
    });
  });

  describe('AST Serialization (Roundtrip & Export)', () => {
    it('should serialize blocks back into clean GFM Markdown', () => {
      const originalMd = '# Title\n\nThis is a paragraph with **bold** text.\n\n- [x] Done\n\n> 💡 Tip: Keep it clean';
      const blocks = NotionBlockEngine.fromMarkdown(originalMd);
      const serializedMd = NotionBlockEngine.toMarkdown(blocks);

      assert.ok(serializedMd.includes('# Title'));
      assert.ok(serializedMd.includes('**bold**'));
      assert.ok(serializedMd.includes('- [x] Done'));
      assert.ok(serializedMd.includes('> 💡 Tip: Keep it clean'));
    });

    it('should serialize blocks into clean HTML', () => {
      const md = '# Heading\n\n> 💡 Callout';
      const blocks = NotionBlockEngine.fromMarkdown(md);
      const html = NotionBlockEngine.toHtml(blocks);

      assert.ok(html.includes('<h1>Heading</h1>'));
      assert.ok(html.includes('class="notion-callout"'));
    });

    it('should generate dual clipboard payload (Plain Text & HTML)', () => {
      const md = '## Quick Note\n\n- Item 1\n- Item 2';
      const blocks = NotionBlockEngine.fromMarkdown(md);
      const clipboard = NotionBlockEngine.toClipboard(blocks);

      assert.ok(clipboard.text.includes('## Quick Note'));
      assert.ok(clipboard.html.includes('<h2>Quick Note</h2>'));
      assert.equal(clipboard.blocks.length, 3);
    });
  });
});
