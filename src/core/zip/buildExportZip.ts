import type { Comment } from '../comments/types';
import { injectCommentIds } from '../inject/injectCommentIds';
import { resolveFilePath } from '../inject/resolveFilePath';
import { renderCommentsMarkdown } from '../render/renderCommentsMarkdown';
import { isHtmlEntry, readZip } from './readZip';
import { writeZip } from './writeZip';

export const COMMENTS_JSON = 'comments.json';
export const COMMENTS_MD = 'comments.md';

export interface ExportStats {
  total: number;
  anchored: number;
  ambiguous: number;
  unanchored: number;
}

export interface BuildExportZipResult {
  bytes: Uint8Array;
  comments: Comment[];
  stats: ExportStats;
}

/**
 * 官方 zip → 注入 data-comment-id → 加 comments.json／comments.md → 新 zip。
 * 非 HTML 的 entry 原封不動。
 */
export function buildExportZip(
  originalZip: Uint8Array,
  comments: readonly Comment[]
): BuildExportZipResult {
  const { files, order } = readZip(originalZip);
  const htmlEntries = order.filter(isHtmlEntry);
  const byEntry = new Map<string, Comment[]>();
  const result: Comment[] = comments.map(c => ({
    ...c,
    anchored: false,
    candidates: [],
  }));

  for (const comment of result) {
    const entry = resolveFilePath(comment.filePath, htmlEntries);

    if (!entry) {
      continue;
    }

    const list = byEntry.get(entry) ?? [];

    list.push(comment);
    byEntry.set(entry, list);
  }

  const decoder = new TextDecoder('utf-8');
  const encoder = new TextEncoder();
  const out = new Map<string, Uint8Array>(files);

  for (const [entry, list] of byEntry) {
    const source = files.get(entry);

    if (!source) {
      continue;
    }

    const injected = injectCommentIds(decoder.decode(source), list);
    const anchored = new Set(injected.anchoredIds);

    for (const comment of list) {
      comment.anchored = anchored.has(comment.commentId);
      comment.candidates = injected.candidates.get(comment.commentId) ?? [];
    }

    out.set(entry, encoder.encode(injected.html));
  }

  out.set(
    COMMENTS_JSON,
    encoder.encode(`${JSON.stringify(result, null, 2)}\n`)
  );
  out.set(COMMENTS_MD, encoder.encode(renderCommentsMarkdown(result)));

  const anchoredCount = result.filter(c => c.anchored).length;
  const ambiguousCount = result.filter(
    c => !c.anchored && c.candidates.length > 1
  ).length;

  return {
    bytes: writeZip(out),
    comments: result,
    stats: {
      total: result.length,
      anchored: anchoredCount,
      ambiguous: ambiguousCount,
      unanchored: result.length - anchoredCount - ambiguousCount,
    },
  };
}
