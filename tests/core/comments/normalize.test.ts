import { describe, expect, it } from 'vitest';

import { normalizeComment } from '@core/comments/normalize';

const full = {
  commentId: 'c1',
  projectId: 'p1',
  authorDisplayName: 'Yuri',
  authorAccountUuid: 'u1',
  body: 'hello',
  filePath: '10 原型_訪客班級流程.dc.html',
  elementSelector: '[data-comment-anchor="abc-div"]',
  elementDescriptor: 'dom: div › span\ntext: "Pick"',
  pinX: 0.25,
  pinY: '0.5',
  createdAt: '2026-09-10T01:02:03Z',
  resolvedAt: '2026-09-11T00:00:00Z',
  replies: [
    {
      replyId: 'r1',
      authorDisplayName: 'Bob',
      body: 'ok',
      createdAt: '2026-09-10T02:00:00Z',
    },
    { notAReply: true },
  ],
};

describe('normalizeComment', () => {
  it('完整欄位轉換', () => {
    expect(normalizeComment(full)).toEqual({
      commentId: 'c1',
      projectId: 'p1',
      filePath: '10 原型_訪客班級流程.dc.html',
      elementSelector: '[data-comment-anchor="abc-div"]',
      elementDescriptor: 'dom: div › span\ntext: "Pick"',
      pinX: 0.25,
      pinY: 0.5,
      body: 'hello',
      author: 'Yuri',
      authorAccountUuid: 'u1',
      createdAt: '2026-09-10T01:02:03Z',
      resolvedAt: '2026-09-11T00:00:00Z',
      replies: [
        {
          replyId: 'r1',
          author: 'Bob',
          authorAccountUuid: null,
          body: 'ok',
          createdAt: '2026-09-10T02:00:00Z',
        },
      ],
      anchored: false,
      candidates: [],
    });
  });

  it('proto3 JSON 省略的欄位補 null／空值', () => {
    expect(
      normalizeComment({ commentId: 'c2', filePath: 'a.dc.html' })
    ).toEqual({
      commentId: 'c2',
      projectId: null,
      filePath: 'a.dc.html',
      elementSelector: null,
      elementDescriptor: '',
      pinX: null,
      pinY: null,
      body: '',
      author: '',
      authorAccountUuid: null,
      createdAt: '',
      resolvedAt: null,
      replies: [],
      anchored: false,
      candidates: [],
    });
  });

  it('缺 commentId 或 filePath、或不是物件，回 null', () => {
    expect(normalizeComment({ filePath: 'a' })).toBeNull();
    expect(normalizeComment({ commentId: 'c' })).toBeNull();
    expect(normalizeComment('x')).toBeNull();
    expect(normalizeComment(null)).toBeNull();
    expect(normalizeComment([])).toBeNull();
  });

  it('非數值的 pin 視為 null', () => {
    expect(
      normalizeComment({ ...full, pinX: 'abc', pinY: {} })?.pinX
    ).toBeNull();
    expect(
      normalizeComment({ ...full, pinX: 'abc', pinY: {} })?.pinY
    ).toBeNull();
  });
});
