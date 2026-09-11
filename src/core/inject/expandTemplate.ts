import { type ChildNode, Document, Element, Text } from 'domhandler';
import { appendChild } from 'domutils';

/**
 * 把 .dc.html 的模板靜態展開成「預覽狀態」的虛擬 DOM，
 * 好讓 Claude Design 留言裡那種渲染後的 selector 比得到。
 *
 * 展開規則（對應 support.js 的渲染）：
 * - 每個模板元素依前序走訪編 `data-dc-tpl`（support.js 的 compileTemplate 就是這樣編的，含 helmet 子樹）
 * - <helmet> 在渲染期被搬進 <head>，從 body 移除
 * - <sc-if hint-placeholder-val="{{ true|false }}">：true 時子節點原地提升，false 時整段移除，缺省視為 true；
 *   `allBranches` 時所有分支都保留（給 data-dc-tpl 這種與狀態無關的錨點用）
 * - <sc-for hint-placeholder-count="N">：子節點重複 N 次，缺省 1
 * - 文字裡的 `{{ … }}` 渲染成 <span class="sc-interp">，映射回它所在的來源元素
 * - <x-dc> 的子節點放進 body > div#dc-root > div.sc-host 底下（Claude Design 預覽的包裝）
 *
 * 每個虛擬元素都記錄它來自哪個來源元素，比對到之後可以映射回去改原始碼。
 */
export interface ExpandedTemplate {
  document: Document;
  sourceOf: WeakMap<Element, Element>;
}

export interface ExpandOptions {
  /** 忽略 sc-if 的 placeholder，所有分支都展開 */
  allBranches?: boolean;
}

export const TPL_ATTR = 'data-dc-tpl';
export const INTERP_CLASS = 'sc-interp';

const TEMPLATE_ROOT = 'x-dc';
const INTERP = /\{\{[\s\S]*?\}\}/g;

export function placeholderBool(value: string | undefined): boolean {
  if (value === undefined) {
    return true;
  }

  const normalized = value.replace(/[{}\s]/g, '').toLowerCase();

  return normalized !== 'false' && normalized !== '0' && normalized !== 'null';
}

export function placeholderCount(value: string | undefined): number {
  if (value === undefined) {
    return 1;
  }

  const parsed = Number.parseInt(value.replace(/[{}\s]/g, ''), 10);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
}

/** 文字節點裡有幾個 `{{ }}` 插值（渲染後每個都是一個 span.sc-interp）。 */
export function interpolationCount(text: string): number {
  return (text.match(INTERP) ?? []).length;
}

export function findFirst(
  node: ChildNode | Document,
  tagName: string
): Element | null {
  if (node instanceof Element && node.name === tagName) {
    return node;
  }

  if ('children' in node) {
    for (const child of node.children) {
      const hit = findFirst(child, tagName);

      if (hit) {
        return hit;
      }
    }
  }

  return null;
}

export function findTemplateRoot(doc: Document): Element | null {
  return findFirst(doc, TEMPLATE_ROOT) ?? findFirst(doc, 'body');
}

/** support.js 的編號：模板內容的元素依前序走訪，從 0 起算。 */
export function templateIds(root: Element): Map<Element, number> {
  const ids = new Map<Element, number>();
  let next = 0;
  const stamp = (nodes: readonly ChildNode[]): void => {
    for (const node of nodes) {
      if (node instanceof Element) {
        ids.set(node, next);
        next += 1;
        stamp(node.children);
      }
    }
  };

  stamp(root.children);

  return ids;
}

export function expandTemplate(
  source: Document,
  options: ExpandOptions = {}
): ExpandedTemplate {
  const sourceOf = new WeakMap<Element, Element>();
  const templateRoot = findTemplateRoot(source);
  const ids = templateRoot
    ? templateIds(templateRoot)
    : new Map<Element, number>();

  const expandInto = (
    parent: Element,
    children: readonly ChildNode[],
    owner: Element | null
  ): void => {
    for (const child of children) {
      if (child instanceof Text) {
        for (let i = interpolationCount(child.data); i > 0; i -= 1) {
          const interp = new Element('span', { class: INTERP_CLASS });

          if (owner) {
            sourceOf.set(interp, owner);
          }

          appendChild(parent, interp);
        }

        continue;
      }

      if (!(child instanceof Element)) {
        continue;
      }

      switch (child.name) {
        case 'helmet':
          break;
        case 'sc-if':
          if (
            options.allBranches ||
            placeholderBool(child.attribs['hint-placeholder-val'])
          ) {
            expandInto(parent, child.children, owner);
          }

          break;
        case 'sc-for': {
          const count = placeholderCount(
            child.attribs['hint-placeholder-count']
          );

          for (let i = 0; i < count; i += 1) {
            expandInto(parent, child.children, owner);
          }

          break;
        }
        default: {
          const attribs = { ...child.attribs };
          const id = ids.get(child);

          if (id !== undefined) {
            attribs[TPL_ATTR] = String(id);
          }

          const clone = new Element(child.name, attribs);

          sourceOf.set(clone, child);
          appendChild(parent, clone);
          expandInto(clone, child.children, child);
        }
      }
    }
  };

  const html = new Element('html', {});
  const body = new Element('body', {});
  const dcRoot = new Element('div', { id: 'dc-root' });
  const host = new Element('div', { class: 'sc-host' });

  appendChild(html, body);
  appendChild(body, dcRoot);
  appendChild(dcRoot, host);

  if (templateRoot) {
    expandInto(host, templateRoot.children, null);
  }

  const document = new Document([]);

  appendChild(document, html);

  return { document, sourceOf };
}
