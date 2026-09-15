import { type ChildNode, type Document, Element } from 'domhandler';

import type { DescriptorLeaf } from './descriptor';
import { type ExpandedTemplate, INTERP_CLASS } from './expandTemplate';

/**
 * `data-om-id="<hash>:<n>"` 是 Claude Design 預覽期蓋在元素上的編號。
 * 實測（2026-09-15，五個真實留言、兩個頁面）：n 等於來源檔以文件前序走訪、
 * 跳過 <html> 與 <head> 本身後的 0-based 序號——多數情況如此，但曾出現差一的案例，
 * 所以這裡列出相鄰幾個位移當候選，再用描述裡的 `dom:` 末段（標籤、第幾個／共幾個）篩選。
 */
const OFFSETS = [2, 3, 1, 4];

export function preorderElements(doc: Document): Element[] {
  const out: Element[] = [];
  const walk = (nodes: readonly ChildNode[]): void => {
    for (const node of nodes) {
      if (node instanceof Element) {
        out.push(node);
        walk(node.children);
      }
    }
  };

  walk(doc.children);

  return out;
}

/** 來源元素 → 展開後的虛擬節點們（sc-for 會複製多份）。 */
function virtualClones(expanded: ExpandedTemplate): Map<Element, Element[]> {
  const map = new Map<Element, Element[]>();
  const walk = (nodes: readonly ChildNode[]): void => {
    for (const node of nodes) {
      if (!(node instanceof Element)) {
        continue;
      }

      const source = expanded.sourceOf.get(node);

      if (source) {
        const list = map.get(source) ?? [];

        list.push(node);
        map.set(source, list);
      }

      walk(node.children);
    }
  };

  walk(expanded.document.children);

  return map;
}

function elementChildren(element: Element): Element[] {
  return element.children.filter((c): c is Element => c instanceof Element);
}

function matchesLeaf(
  element: Element,
  leaf: DescriptorLeaf,
  clones: Map<Element, Element[]>
): boolean {
  if (element.name.toLowerCase() !== leaf.tag) {
    return false;
  }

  // 描述裡的 class（例如 scp0）可能是執行期才加的，不當條件

  if (!leaf.position && !leaf.parentTag && !leaf.children) {
    return true;
  }

  // 位置與父標籤要在「渲染後」的 DOM 上看：拿展開後的虛擬節點來比
  const candidates = clones.get(element) ?? [];

  return candidates.some(clone => {
    const parent = clone.parent;

    if (!(parent instanceof Element)) {
      return false;
    }

    if (leaf.parentTag && parent.name.toLowerCase() !== leaf.parentTag) {
      return false;
    }

    if (leaf.position) {
      const siblings = elementChildren(parent);

      if (
        siblings.length !== leaf.position.total ||
        siblings.indexOf(clone) + 1 !== leaf.position.index
      ) {
        return false;
      }
    }

    if (leaf.children) {
      // 描述的 `text` 對應渲染後的文字或插值 span；其餘逐一比標籤
      const expected = leaf.children.filter(c => c !== 'text');
      const actual = elementChildren(clone)
        .filter(c => c.attribs['class'] !== INTERP_CLASS)
        .map(c => c.name.toLowerCase());

      if (expected.join(',') !== actual.join(',')) {
        return false;
      }
    }

    return true;
  });
}

/**
 * 依 om-id 序號找候選來源元素。有描述末段就用它篩；
 * 沒有描述時只信最常見的位移（2）。回傳順序：位移 2 優先。
 */
export function resolveOmIdCandidates(
  doc: Document,
  index: number,
  leaf: DescriptorLeaf | null,
  expanded: (allBranches: boolean) => ExpandedTemplate
): Element[] {
  const order = preorderElements(doc);

  if (!leaf) {
    const element = order[index + 2];

    return element ? [element] : [];
  }

  // 先用預設狀態的渲染結果比位置；目標在關閉的分支裡才用全分支展開
  for (const allBranches of [false, true]) {
    const clones = virtualClones(expanded(allBranches));
    const out: Element[] = [];

    for (const offset of OFFSETS) {
      const element = order[index + offset];

      if (
        element &&
        !out.includes(element) &&
        matchesLeaf(element, leaf, clones)
      ) {
        out.push(element);
      }
    }

    if (out.length > 0) {
      return out;
    }
  }

  return [];
}
