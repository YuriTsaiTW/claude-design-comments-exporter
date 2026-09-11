import { type ChildNode, type Document, Element, Text } from 'domhandler';

import {
  INTERP_CLASS,
  findTemplateRoot,
  interpolationCount,
  placeholderBool,
  placeholderCount,
} from './expandTemplate';

/**
 * 留言的 selector 是預覽渲染後的路徑（`#dc-root > div:nth-child(1) > … > img:nth-child(1)`），
 * 但同一份模板在不同互動狀態（sc-if 開關、sc-for 次數）會渲染出不同的 DOM。
 * 這個模組把 selector 拆成一段段，逐層列舉「這一層的子節點在各種狀態下會長什麼樣」，
 * 收集所有可能對應的來源元素。狀態只在該層局部列舉，不做全頁組合，避免爆炸。
 */

export interface ChainStep {
  tag: string | null;
  id: string | null;
  classes: string[];
  nth: number | null;
}

const STEP =
  /^(?:([a-zA-Z][\w-]*)|\*)?(?:#([\w-]+))?((?:\.[\w-]+)*)(?::nth-child\((\d+)\))?$/;

/** 只接受 `>` 串接的簡單鏈；其他形式回 null，交給 css-select 走預設狀態。 */
export function parseChain(selector: string): ChainStep[] | null {
  const parts = selector.split('>').map(p => p.trim());
  const steps: ChainStep[] = [];

  for (const part of parts) {
    const match = STEP.exec(part);

    if (!match || part === '') {
      return null;
    }

    const [, tag, id, classChain, nth] = match;

    steps.push({
      tag: tag ? tag.toLowerCase() : null,
      id: id ?? null,
      classes: classChain ? classChain.split('.').filter(Boolean) : [],
      nth: nth ? Number.parseInt(nth, 10) : null,
    });
  }

  return steps;
}

export interface RenderedChild {
  tag: string;
  id: string | null;
  classes: string[];
  /** 對應的來源元素；虛擬包裝層（#dc-root、.sc-host）沒有 */
  source: Element | null;
  /** 這個節點在渲染後的子節點來源（模板子節點，或包裝層的固定子節點） */
  children: readonly ChildNode[] | readonly RenderedChild[];
}

const MAX_VARIANTS = 512;

function fromElement(element: Element): RenderedChild {
  const classAttr = element.attribs['class'];

  return {
    tag: element.name.toLowerCase(),
    id: element.attribs['id'] ?? null,
    classes: classAttr ? classAttr.split(/\s+/).filter(Boolean) : [],
    source: element,
    children: element.children,
  };
}

function isRenderedList(
  children: readonly ChildNode[] | readonly RenderedChild[]
): children is readonly RenderedChild[] {
  return (
    children.length > 0 &&
    !(children[0] instanceof Element) &&
    !('type' in (children[0] as object))
  );
}

function cross(
  heads: RenderedChild[][],
  rests: RenderedChild[][]
): RenderedChild[][] {
  const out: RenderedChild[][] = [];

  for (const head of heads) {
    for (const rest of rests) {
      out.push([...head, ...rest]);

      if (out.length >= MAX_VARIANTS) {
        return out;
      }
    }
  }

  return out;
}

/**
 * 列出這一組模板子節點在各種局部狀態下的渲染結果。
 * 第一個結果一定是預設狀態（placeholder 值）。
 * `neededIndex` 是上層要找的 nth-child 序號，用來限制 sc-for 要試的次數。
 */
export function renderedVariants(
  nodes: readonly ChildNode[],
  neededIndex: number
): RenderedChild[][] {
  const elements = nodes.filter(
    (n): n is Element | Text =>
      n instanceof Element ||
      (n instanceof Text && interpolationCount(n.data) > 0)
  );

  const build = (index: number): RenderedChild[][] => {
    if (index >= elements.length) {
      return [[]];
    }

    const node = elements[index] as Element | Text;
    const rest = build(index + 1);
    let heads: RenderedChild[][];

    if (node instanceof Text) {
      const owner = node.parent instanceof Element ? node.parent : null;
      const interps: RenderedChild[] = [];

      for (let i = interpolationCount(node.data); i > 0; i -= 1) {
        interps.push({
          tag: 'span',
          id: null,
          classes: [INTERP_CLASS],
          source: owner,
          children: [],
        });
      }

      return cross([interps], rest);
    }

    switch (node.name) {
      case 'helmet':
        return rest;
      case 'sc-if': {
        const branch = renderedVariants(node.children, neededIndex);
        const defaultOn = placeholderBool(node.attribs['hint-placeholder-val']);

        heads = defaultOn ? [...branch, []] : [[], ...branch];

        break;
      }
      case 'sc-for': {
        const placeholder = placeholderCount(
          node.attribs['hint-placeholder-count']
        );
        const counts = [placeholder];

        for (let c = 0; c <= Math.min(neededIndex, 32); c += 1) {
          if (!counts.includes(c)) {
            counts.push(c);
          }
        }

        const branch = renderedVariants(node.children, neededIndex);

        heads = [];

        for (const count of counts) {
          for (const iteration of branch) {
            const repeated: RenderedChild[] = [];

            for (let i = 0; i < count; i += 1) {
              repeated.push(...iteration);
            }

            heads.push(repeated);
          }
        }

        break;
      }
      default:
        heads = [[fromElement(node)]];
    }

    return cross(heads, rest);
  };

  return build(0);
}

function matches(step: ChainStep, child: RenderedChild): boolean {
  if (step.tag && step.tag !== child.tag) {
    return false;
  }

  if (step.id && step.id !== child.id) {
    return false;
  }

  return step.classes.every(c => child.classes.includes(c));
}

function childrenVariants(
  node: RenderedChild,
  neededIndex: number
): RenderedChild[][] {
  return isRenderedList(node.children)
    ? [node.children as RenderedChild[]]
    : renderedVariants(node.children as readonly ChildNode[], neededIndex);
}

function collectById(
  nodes: readonly ChildNode[],
  id: string,
  out: Element[]
): void {
  for (const node of nodes) {
    if (!(node instanceof Element)) {
      continue;
    }

    if (node.attribs['id'] === id) {
      out.push(node);
    }

    collectById(node.children, id, out);
  }
}

/** 預覽頁的包裝層：html > body > div#dc-root > div.sc-host > 模板內容。 */
function wrappers(doc: Document): RenderedChild {
  const template = findTemplateRoot(doc);
  const host: RenderedChild = {
    tag: 'div',
    id: null,
    classes: ['sc-host'],
    source: null,
    children: template ? template.children : [],
  };
  const dcRoot: RenderedChild = {
    tag: 'div',
    id: 'dc-root',
    classes: [],
    source: null,
    children: [host],
  };
  const body: RenderedChild = {
    tag: 'body',
    id: null,
    classes: [],
    source: null,
    children: [dcRoot],
  };
  const html: RenderedChild = {
    tag: 'html',
    id: null,
    classes: [],
    source: null,
    children: [body],
  };

  return {
    tag: '#document',
    id: null,
    classes: [],
    source: null,
    children: [html],
  };
}

/**
 * 依 selector 鏈在所有可能狀態下找出候選來源元素。
 * 回傳順序：預設狀態先命中的排前面；同一元素只出現一次。
 */
export function resolveChainCandidates(
  doc: Document,
  selector: string
): Element[] {
  const steps = parseChain(selector);

  if (!steps || steps.length === 0) {
    return [];
  }

  const root = wrappers(doc);
  const results: Element[] = [];
  const seen = new Set<Element>();

  const descend = (node: RenderedChild, stepIndex: number): void => {
    const step = steps[stepIndex] as ChainStep;
    const needed = step.nth ?? 1;

    for (const variant of childrenVariants(node, needed)) {
      const picks = step.nth
        ? [variant[step.nth - 1]].filter(
            (c): c is RenderedChild => c !== undefined && matches(step, c)
          )
        : variant.filter(c => matches(step, c));

      for (const pick of picks) {
        if (stepIndex === steps.length - 1) {
          if (pick.source && !seen.has(pick.source)) {
            seen.add(pick.source);
            results.push(pick.source);
          }
        } else {
          descend(pick, stepIndex + 1);
        }
      }
    }
  };

  const first = steps[0] as ChainStep;

  if (first.id && first.nth === null) {
    // 以 id 起頭：先看包裝層，再看模板內任何同 id 的元素（與狀態無關）
    const starts: RenderedChild[] = [];
    const walk = (node: RenderedChild): void => {
      if (node.id === first.id && matches(first, node)) {
        starts.push(node);
      }

      if (isRenderedList(node.children)) {
        for (const child of node.children as RenderedChild[]) {
          walk(child);
        }
      }
    };

    walk(root);

    if (starts.length === 0) {
      const template = findTemplateRoot(doc);
      const found: Element[] = [];

      if (template) {
        collectById(template.children, first.id, found);
      }

      starts.push(...found.map(fromElement).filter(c => matches(first, c)));
    }

    for (const start of starts) {
      if (steps.length === 1) {
        if (start.source && !seen.has(start.source)) {
          seen.add(start.source);
          results.push(start.source);
        }
      } else {
        descend(start, 1);
      }
    }

    return results;
  }

  // 以 html / body 起頭的鏈從文件根開始
  descend(root, 0);

  return results;
}
