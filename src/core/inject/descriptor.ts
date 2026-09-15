import { type ChildNode, Element, Text } from 'domhandler';

const TEXT_LINE = /^text:\s+"(.*)"\s*$/m;

/** 從 elementDescriptor 取出 `text: "…"` 片段（去掉尾端省略號）。 */
export function descriptorText(
  descriptor: string | null | undefined
): string | null {
  if (!descriptor) {
    return null;
  }

  const match = TEXT_LINE.exec(descriptor);
  const text = match?.[1]?.replace(/…$/, '').trim();

  return text ? text : null;
}

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function elementText(element: Element): string {
  const parts: string[] = [];
  const walk = (nodes: readonly ChildNode[]): void => {
    for (const node of nodes) {
      if (node instanceof Text) {
        parts.push(node.data);
      } else if (node instanceof Element) {
        walk(node.children);
      }
    }
  };

  walk(element.children);

  return collapse(parts.join(' '));
}

/**
 * 多個候選時，用描述裡的文字片段篩選。
 * 篩到剩零個（例如文字是 {{ }} 綁定）就維持原候選，不亂猜。
 */
export function disambiguateByText(
  candidates: readonly Element[],
  descriptor: string | null | undefined
): Element[] {
  if (candidates.length < 2) {
    return [...candidates];
  }

  const needle = descriptorText(descriptor);

  if (!needle) {
    return [...candidates];
  }

  const collapsed = collapse(needle);
  const kept = candidates.filter(c => elementText(c).includes(collapsed));

  return kept.length > 0 ? kept : [...candidates];
}

/** `selector: [data-om-id="<hash>:<n>"]` 這一行。 */
export interface OmId {
  hash: string;
  index: number;
}

const OM_ID_LINE = /\[data-om-id="([^":]+):(\d+)"\]/;

export function parseOmId(text: string | null | undefined): OmId | null {
  if (!text) {
    return null;
  }

  const match = OM_ID_LINE.exec(text);

  if (!match?.[1] || match[2] === undefined) {
    return null;
  }

  return { hash: match[1], index: Number.parseInt(match[2], 10) };
}

/** `dom:` 那一行的最後一段，例如 `div.scp0[2/2]`、`path[2/6]`、`img`。 */
export interface DescriptorLeaf {
  tag: string;
  classes: string[];
  /** 在渲染後 DOM 裡是父節點的第幾個元素子節點／共幾個 */
  position: { index: number; total: number } | null;
  parentTag: string | null;
  /** `children:` 那一行列的子元素標籤（`text` 代表只有文字）；沒有這一行為 null */
  children: string[] | null;
}

const DOM_LINE = /^dom:\s+(.+)$/m;
const CHILDREN_LINE = /^children:\s+(.+)$/m;
const LEAF =
  /^([a-zA-Z][\w-]*)(?:#[\w-]+)?((?:\.[\w-]+)*)(?:\[(\d+)\/(\d+)\])?$/;

export function descriptorLeaf(
  descriptor: string | null | undefined
): DescriptorLeaf | null {
  const line = descriptor ? DOM_LINE.exec(descriptor)?.[1] : undefined;

  if (!line) {
    return null;
  }

  const parts = line.split('›').map(p => p.trim());
  const leaf = parts.at(-1);
  const parent = parts.at(-2);
  const match = leaf ? LEAF.exec(leaf) : null;

  if (!match?.[1]) {
    return null;
  }

  const [, tag, classChain, index, total] = match;
  const parentMatch = parent ? LEAF.exec(parent) : null;
  const childrenLine = CHILDREN_LINE.exec(descriptor ?? '')?.[1];

  return {
    tag: tag.toLowerCase(),
    classes: classChain ? classChain.split('.').filter(Boolean) : [],
    position:
      index !== undefined && total !== undefined
        ? {
            index: Number.parseInt(index, 10),
            total: Number.parseInt(total, 10),
          }
        : null,
    parentTag: parentMatch?.[1]?.toLowerCase() ?? null,
    children: childrenLine
      ? childrenLine
          .split(',')
          .map(c => c.trim().toLowerCase())
          .filter(Boolean)
      : null,
  };
}
