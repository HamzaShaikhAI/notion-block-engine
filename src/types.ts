/**
 * Notion Block Engine - AST Type Definitions
 * Matches official Notion API Block Object specifications while being lightweight and portable.
 */

export type NotionColor =
  | 'default'
  | 'gray'
  | 'brown'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red'
  | 'gray_background'
  | 'brown_background'
  | 'orange_background'
  | 'yellow_background'
  | 'green_background'
  | 'blue_background'
  | 'purple_background'
  | 'pink_background'
  | 'red_background';

export interface Annotations {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  code?: boolean;
  color?: NotionColor;
}

export interface TextLink {
  url: string;
}

export interface RichTextItem {
  type: 'text' | 'equation' | 'mention';
  text?: {
    content: string;
    link?: TextLink | null;
  };
  equation?: {
    expression: string;
  };
  plain_text: string;
  href?: string | null;
  annotations: Annotations;
}

export interface BaseBlock {
  id?: string;
  type: string;
  has_children?: boolean;
  children?: NotionBlock[];
}

export interface ParagraphBlock extends BaseBlock {
  type: 'paragraph';
  paragraph: {
    rich_text: RichTextItem[];
    color?: NotionColor;
  };
}

export interface Heading1Block extends BaseBlock {
  type: 'heading_1';
  heading_1: {
    rich_text: RichTextItem[];
    color?: NotionColor;
    is_toggleable?: boolean;
  };
}

export interface Heading2Block extends BaseBlock {
  type: 'heading_2';
  heading_2: {
    rich_text: RichTextItem[];
    color?: NotionColor;
    is_toggleable?: boolean;
  };
}

export interface Heading3Block extends BaseBlock {
  type: 'heading_3';
  heading_3: {
    rich_text: RichTextItem[];
    color?: NotionColor;
    is_toggleable?: boolean;
  };
}

export interface BulletedListItemBlock extends BaseBlock {
  type: 'bulleted_list_item';
  bulleted_list_item: {
    rich_text: RichTextItem[];
    color?: NotionColor;
  };
}

export interface NumberedListItemBlock extends BaseBlock {
  type: 'numbered_list_item';
  numbered_list_item: {
    rich_text: RichTextItem[];
    color?: NotionColor;
  };
}

export interface ToDoBlock extends BaseBlock {
  type: 'to_do';
  to_do: {
    rich_text: RichTextItem[];
    checked: boolean;
    color?: NotionColor;
  };
}

export interface ToggleBlock extends BaseBlock {
  type: 'toggle';
  toggle: {
    rich_text: RichTextItem[];
    color?: NotionColor;
  };
}

export interface CodeBlock extends BaseBlock {
  type: 'code';
  code: {
    rich_text: RichTextItem[];
    language: string;
    caption?: RichTextItem[];
  };
}

export interface QuoteBlock extends BaseBlock {
  type: 'quote';
  quote: {
    rich_text: RichTextItem[];
    color?: NotionColor;
  };
}

export interface CalloutBlock extends BaseBlock {
  type: 'callout';
  callout: {
    rich_text: RichTextItem[];
    icon?: {
      type: 'emoji';
      emoji: string;
    };
    color?: NotionColor;
  };
}

export interface DividerBlock extends BaseBlock {
  type: 'divider';
  divider: Record<string, never>;
}

export interface TableRowBlock extends BaseBlock {
  type: 'table_row';
  table_row: {
    cells: RichTextItem[][];
  };
}

export interface TableBlock extends BaseBlock {
  type: 'table';
  table: {
    table_width: number;
    has_column_header: boolean;
    has_row_header: boolean;
  };
  children?: TableRowBlock[];
}

export interface EquationBlock extends BaseBlock {
  type: 'equation';
  equation: {
    expression: string;
  };
}

export interface BookmarkBlock extends BaseBlock {
  type: 'bookmark';
  bookmark: {
    url: string;
    caption?: RichTextItem[];
  };
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  image: {
    type: 'external';
    external: {
      url: string;
    };
    caption?: RichTextItem[];
  };
}

export type NotionBlock =
  | ParagraphBlock
  | Heading1Block
  | Heading2Block
  | Heading3Block
  | BulletedListItemBlock
  | NumberedListItemBlock
  | ToDoBlock
  | ToggleBlock
  | CodeBlock
  | QuoteBlock
  | CalloutBlock
  | DividerBlock
  | TableBlock
  | TableRowBlock
  | EquationBlock
  | BookmarkBlock
  | ImageBlock;

export interface ClipboardPayload {
  html: string;
  text: string;
  blocks: NotionBlock[];
}
