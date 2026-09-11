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
