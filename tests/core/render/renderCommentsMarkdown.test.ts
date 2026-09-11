import { describe, expect, it } from 'vitest';

import type { Comment } from '@core/comments/types';
import { renderCommentsMarkdown } from '@core/render/renderCommentsMarkdown';

function comment(overrides: Partial<Comment>): Comment {
  return {
    commentId: 'c',
    projectId: 'p',
    filePath: 'a.dc.html',
    elementSelector: null,
    elementDescriptor: '',
    pinX: null,
    pinY: null,
    body: 'body',
    author: 'A',
    authorAccountUuid: null,
    createdAt: '2026-09-10T00:00:00Z',
    resolvedAt: null,
    replies: [],
    anchored: true,
    candidates: [],
    ...overrides,
  };
}

describe('renderCommentsMarkdown', () => {
  it('依頁面分組、頁內依時間排序', () => {
    const md = renderCommentsMarkdown([
      comment({
        commentId: 'late',
        filePath: 'b.dc.html',
        createdAt: '2026-09-10T02:00:00Z',
      }),
      comment({
        commentId: 'early',
        filePath: 'b.dc.html',
        createdAt: '2026-09-10T01:00:00Z',
      }),
      comment({ commentId: 'only', filePath: 'a.dc.html' }),
    ]);

    const order = [
      '## a.dc.html',
      '### only',
      '## b.dc.html',
      '### early',
      '### late',
    ].map(s => md.indexOf(s));

    expect(order.every(i => i >= 0)).toBe(true);
    expect([...order].sort((x, y) => x - y)).toEqual(order);
    expect(md).toContain('共 3 則留言，2 個頁面。');
  });

  it('標記已解決與 unanchored，回覆縮排', () => {
    const md = renderCommentsMarkdown([
      comment({
        commentId: 'c1',
        resolvedAt: '2026-09-11T00:00:00Z',
        anchored: false,
        elementSelector: 'div > span',
        elementDescriptor: 'dom: div › span\ntext: "Hi"',
        pinX: 0.1,
        pinY: 0.2,
        body: 'line1\nline2',
        replies: [
          {
            replyId: 'r1',
            author: 'B',
            authorAccountUuid: null,
            body: 'reply\nmore',
            createdAt: '2026-09-10T03:00:00Z',
          },
        ],
      }),
    ]);

    expect(md).toContain('### c1 — 已解決 2026-09-11T00:00:00Z (unanchored)');
    expect(md).toContain('- 元素：`div > span`');
    expect(md).toContain('  dom: div › span\n  text: "Hi"');
    expect(md).toContain('- 位置：pin (0.1, 0.2)');
    expect(md).toContain('> line1\n> line2');
    expect(md).toContain(
      '- ↳ **B**（2026-09-10T03:00:00Z）：\n  reply\n  more'
    );
  });

  it('沒有 filePath 的留言歸到未指定頁面', () => {
    expect(renderCommentsMarkdown([comment({ filePath: '' })])).toContain(
      '## (未指定頁面)'
    );
  });

  it('空清單也能輸出', () => {
    expect(renderCommentsMarkdown([])).toBe(
      '# Comments\n\n共 0 則留言，0 個頁面。\n'
    );
  });
});
