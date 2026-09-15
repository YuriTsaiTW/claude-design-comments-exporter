import { selectOne } from 'css-select';
import type { Document, Element, Node } from 'domhandler';
import { parse } from 'parse5';
import { adapter } from 'parse5-htmlparser2-tree-adapter';

import type { AnchorCandidate, Comment } from '../comments/types';
import { descriptorLeaf, disambiguateByText, parseOmId } from './descriptor';
import {
  type ExpandedTemplate,
  TPL_ATTR,
  expandTemplate,
} from './expandTemplate';
import { resolveOmIdCandidates } from './omId';
import { classifySelector } from './selector';
import { resolveChainCandidates } from './templateStates';

export const COMMENT_ID_ATTR = 'data-comment-id';
export const AMBIGUOUS_ATTR = 'data-comment-ambiguous';

export interface InjectResult {
  html: string;
  /** 唯一命中 */
  anchoredIds: string[];
  /** 多個候選都標上，交由人判斷 */
  ambiguousIds: string[];
  /** 完全比對不到 */
  unanchoredIds: string[];
  /** 每則留言的候選元素（位置資訊），unanchored 為空陣列 */
  candidates: Map<string, AnchorCandidate[]>;
}

interface TagLocation {
  startOffset: number;
  endOffset: number;
  startLine: number;
  attrs?: Record<string, { startOffset: number; endOffset: number }>;
}

interface Located {
  sourceCodeLocation?: { startTag?: TagLocation } | null;
}

function startTagOf(element: Element): TagLocation | null {
  return (element as Located).sourceCodeLocation?.startTag ?? null;
}

/** 渲染期 support.js 會把 <x-dc> 換成 host 節點，所以來源檔多一層 x-dc。 */
function selectorCandidates(selector: string): string[] {
  const out = [selector];
  const withXdc = selector.replace(
    /^(html\s*>\s*)?body\s*>\s*/,
    'body > x-dc > '
  );

  if (withXdc !== selector) {
    out.push(withXdc);
  }

  return out;
}

function trySelect(selector: string, root: Document): Element | null {
  try {
    return selectOne<Node, Element>(selector, root);
  } catch {
    // 無效的 selector：視為比對不到
    return null;
  }
}

/**
 * 三層定位：
 * 1. 直接在來源檔比對（data-comment-anchor 或作者手寫的 selector）
 * 2. 依 selector 鏈在所有互動狀態下列舉候選，再用描述文字消歧
 * 3. 鏈解析不了的 selector，退回預設狀態展開後用 css-select
 */
function locate(
  doc: Document,
  expanded: (allBranches: boolean) => ExpandedTemplate,
  selector: string,
  descriptor: string
): Element[] {
  for (const candidate of selectorCandidates(selector)) {
    const hit = trySelect(candidate, doc);

    if (hit && startTagOf(hit)) {
      return [hit];
    }
  }

  // data-comment-anchor 沒被匯出時，描述裡的 data-om-id 序號是最精準的替代錨點
  const omId = parseOmId(selector) ?? parseOmId(descriptor);

  if (omId) {
    const byOmId = resolveOmIdCandidates(
      doc,
      omId.index,
      descriptorLeaf(descriptor),
      expanded
    ).filter(startTagOf);

    if (byOmId.length > 0) {
      return disambiguateByText(byOmId, descriptor);
    }
  }

  const byStates = resolveChainCandidates(doc, selector).filter(startTagOf);

  if (byStates.length > 0) {
    return disambiguateByText(byStates, descriptor);
  }

  // data-dc-tpl 是與互動狀態無關的模板流水號，所有分支都展開再找
  const virtual = expanded(selector.includes(`[${TPL_ATTR}=`));
  const hit = trySelect(selector, virtual.document);
  const source = hit ? virtual.sourceOf.get(hit) : undefined;

  return source && startTagOf(source) ? [source] : [];
}

function mergeIds(
  existing: string | undefined,
  incoming: readonly string[]
): string {
  const merged = new Set((existing ?? '').split(/\s+/).filter(Boolean));

  for (const id of incoming) {
    merged.add(id);
  }

  return [...merged].join(' ');
}

interface Edit {
  start: number;
  end: number;
  text: string;
}

function planAttribute(
  html: string,
  element: Element,
  attr: string,
  ids: readonly string[]
): Edit {
  const startTag = startTagOf(element);

  if (!startTag) {
    throw new Error('元素沒有 start tag 位置資訊');
  }

  const value = mergeIds(element.attribs[attr], ids);
  const attrText = `${attr}="${value}"`;
  const existing = startTag.attrs?.[attr];

  if (existing) {
    return {
      start: existing.startOffset,
      end: existing.endOffset,
      text: attrText,
    };
  }

  // 在 start tag 的 `>`（或 `/>`）之前插入
  let insertAt = startTag.endOffset - 1;

  if (html[insertAt - 1] === '/') {
    insertAt -= 1;
  }

  const needsSpace = !/\s/.test(html[insertAt - 1] ?? '');

  return {
    start: insertAt,
    end: insertAt,
    text: `${needsSpace ? ' ' : ''}${attrText}${html[insertAt] === '/' ? ' ' : ''}`,
  };
}

function describe(element: Element): AnchorCandidate {
  const startTag = startTagOf(element);

  return { tag: element.name, line: startTag?.startLine ?? 0 };
}

/**
 * 依留言的 elementSelector 在頁面 HTML 標上 data-comment-id。
 * 唯一命中：標 data-comment-id；多個候選：每個候選都標 data-comment-id 並加 data-comment-ambiguous；
 * 只在命中的 start tag 插入或改寫這兩個屬性，其他位元組原樣保留，data-comment-anchor 不動。
 */
export function injectCommentIds(
  html: string,
  comments: readonly Comment[]
): InjectResult {
  const result: InjectResult = {
    html,
    anchoredIds: [],
    ambiguousIds: [],
    unanchoredIds: [],
    candidates: new Map(),
  };

  if (comments.length === 0) {
    return result;
  }

  const doc = parse(html, {
    treeAdapter: adapter,
    sourceCodeLocationInfo: true,
  });
  const expandedCache = new Map<boolean, ExpandedTemplate>();
  const expanded = (allBranches: boolean): ExpandedTemplate => {
    let cached = expandedCache.get(allBranches);

    if (!cached) {
      cached = expandTemplate(doc, { allBranches });
      expandedCache.set(allBranches, cached);
    }

    return cached;
  };
  const idHits = new Map<Element, string[]>();
  const ambiguousHits = new Map<Element, string[]>();
  const record = (
    map: Map<Element, string[]>,
    element: Element,
    id: string
  ): void => {
    const list = map.get(element) ?? [];

    list.push(id);
    map.set(element, list);
  };

  for (const comment of comments) {
    const kind = classifySelector(comment.elementSelector);
    const found =
      kind.kind === 'none'
        ? []
        : locate(doc, expanded, kind.selector, comment.elementDescriptor);

    result.candidates.set(comment.commentId, found.map(describe));

    if (found.length === 0) {
      result.unanchoredIds.push(comment.commentId);
      continue;
    }

    for (const element of found) {
      record(idHits, element, comment.commentId);

      if (found.length > 1) {
        record(ambiguousHits, element, comment.commentId);
      }
    }

    (found.length === 1 ? result.anchoredIds : result.ambiguousIds).push(
      comment.commentId
    );
  }

  const edits: Edit[] = [];

  for (const [element, ids] of idHits) {
    edits.push(planAttribute(html, element, COMMENT_ID_ATTR, ids));
  }

  for (const [element, ids] of ambiguousHits) {
    edits.push(planAttribute(html, element, AMBIGUOUS_ATTR, ids));
  }

  // 同一個 start tag 可能有兩個插入點在同一 offset：先排 offset 由大到小，
  // 同 offset 的按加入順序反向套用，維持「data-comment-id 在前、ambiguous 在後」。
  const ordered = edits
    .map((edit, index) => ({ edit, index }))
    .sort((a, b) => b.edit.start - a.edit.start || b.index - a.index);

  let out = html;

  for (const { edit } of ordered) {
    out = `${out.slice(0, edit.start)}${edit.text}${out.slice(edit.end)}`;
  }

  result.html = out;

  return result;
}
