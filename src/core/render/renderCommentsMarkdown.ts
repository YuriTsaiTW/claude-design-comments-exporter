import type { Comment } from '../comments/types';

const NO_PAGE = '(未指定頁面)';

function escapeCell(text: string): string {
  return text.replace(/\r?\n/g, ' ').trim();
}

function indentBody(body: string, indent: string): string {
  return body
    .split(/\r?\n/)
    .map(line => `${indent}${line}`)
    .join('\n');
}

function compareByCreatedAt(a: Comment, b: Comment): number {
  return (
    a.createdAt.localeCompare(b.createdAt) ||
    a.commentId.localeCompare(b.commentId)
  );
}

/** 依頁面分組、依建立時間排序的 Markdown 摘要。 */
export function renderCommentsMarkdown(comments: readonly Comment[]): string {
  const groups = new Map<string, Comment[]>();

  for (const comment of comments) {
    const key = comment.filePath || NO_PAGE;
    const list = groups.get(key) ?? [];

    list.push(comment);
    groups.set(key, list);
  }

  const pages = [...groups.keys()].sort((a, b) => a.localeCompare(b));
  const out: string[] = ['# Comments', ''];

  out.push(`共 ${comments.length} 則留言，${pages.length} 個頁面。`, '');

  for (const page of pages) {
    const list = (groups.get(page) ?? []).sort(compareByCreatedAt);

    out.push(`## ${page}`, '');

    for (const comment of list) {
      const flags: string[] = [];

      if (comment.resolvedAt) {
        flags.push(`已解決 ${comment.resolvedAt}`);
      }

      if (!comment.anchored && comment.candidates.length > 1) {
        flags.push(
          `(ambiguous: ${comment.candidates.length} 個候選，第 ${comment.candidates
            .map(c => c.line)
            .join('、')} 行)`
        );
      } else if (!comment.anchored) {
        flags.push('(unanchored)');
      }

      const suffix = flags.length ? ` — ${flags.join(' ')}` : '';

      out.push(`### ${comment.commentId}${suffix}`, '');
      out.push(`- 作者：${escapeCell(comment.author)}`);
      out.push(`- 時間：${comment.createdAt}`);

      if (comment.elementSelector) {
        out.push(`- 元素：\`${escapeCell(comment.elementSelector)}\``);
      }

      if (comment.elementDescriptor) {
        out.push(
          '- 描述：',
          '',
          '  ```',
          indentBody(comment.elementDescriptor, '  '),
          '  ```'
        );
      }

      if (comment.pinX !== null && comment.pinY !== null) {
        out.push(`- 位置：pin (${comment.pinX}, ${comment.pinY})`);
      }

      out.push('', indentBody(comment.body, '> '), '');

      for (const reply of comment.replies) {
        out.push(`- ↳ **${escapeCell(reply.author)}**（${reply.createdAt}）：`);
        out.push(indentBody(reply.body, '  '), '');
      }
    }
  }

  return `${out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()}\n`;
}
