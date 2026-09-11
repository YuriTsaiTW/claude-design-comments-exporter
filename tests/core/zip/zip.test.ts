import { unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import type { Comment } from '@core/comments/types';
import {
  COMMENTS_JSON,
  COMMENTS_MD,
  buildExportZip,
} from '@core/zip/buildExportZip';
import { isHtmlEntry, readZip } from '@core/zip/readZip';
import { listLocalHeaders, writeZip } from '@core/zip/writeZip';

const enc = new TextEncoder();
const dec = new TextDecoder();

const PAGE = '10 原型_訪客班級流程.dc.html';
const pageHtml =
  '<html><body><x-dc><div id="hero"><span class="t">Hi</span></div></x-dc></body></html>\n';
const binary = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 3]);

function original(): Uint8Array {
  return zipSync({
    [PAGE]: enc.encode(pageHtml),
    'support.js': enc.encode('console.log(1)'),
    '.thumbnail': binary,
    'uploads/圖.svg': enc.encode('<svg/>'),
    'empty-dir/': new Uint8Array(0),
  });
}

function comment(overrides: Partial<Comment>): Comment {
  return {
    commentId: 'c',
    projectId: 'p',
    filePath: PAGE,
    elementSelector: null,
    elementDescriptor: '',
    pinX: null,
    pinY: null,
    body: 'b',
    author: 'A',
    authorAccountUuid: null,
    createdAt: '2026-09-10T00:00:00Z',
    resolvedAt: null,
    replies: [],
    anchored: false,
    candidates: [],
    ...overrides,
  };
}

describe('readZip / isHtmlEntry', () => {
  it('讀出檔案並略過目錄項目', () => {
    const { files, order } = readZip(original());

    expect(order).toEqual([PAGE, 'support.js', '.thumbnail', 'uploads/圖.svg']);
    expect(files.get('.thumbnail')).toEqual(binary);
  });

  it('只有 .html 結尾才是 HTML', () => {
    expect(isHtmlEntry('a.dc.html')).toBe(true);
    expect(isHtmlEntry('A.HTML')).toBe(true);
    expect(isHtmlEntry('.thumbnail')).toBe(false);
    expect(isHtmlEntry('support.js')).toBe(false);
  });
});

describe('writeZip', () => {
  it('非 ASCII 檔名的 entry 都設了 UTF-8 旗標，ASCII 的也能正常讀回', () => {
    const zip = writeZip(
      new Map([
        [PAGE, enc.encode('x')],
        ['a.txt', enc.encode('y')],
      ])
    );
    const headers = listLocalHeaders(zip);

    expect(headers.map(h => h.name)).toEqual([PAGE, 'a.txt']);
    expect(headers[0]?.utf8).toBe(true);
    expect(dec.decode(unzipSync(zip)[PAGE])).toBe('x');
  });
});

describe('buildExportZip', () => {
  it('注入屬性、加上 comments.json/md，其他 entry 原封不動', () => {
    const result = buildExportZip(original(), [
      comment({ commentId: 'hit', elementSelector: '#hero > span.t' }),
      comment({ commentId: 'miss', elementSelector: '.nope' }),
      comment({
        commentId: 'nofile',
        filePath: 'ghost.dc.html',
        elementSelector: 'div',
      }),
    ]);
    const out = unzipSync(result.bytes);

    expect(result.stats).toEqual({
      total: 3,
      anchored: 1,
      ambiguous: 0,
      unanchored: 2,
    });
    expect(dec.decode(out[PAGE])).toBe(
      '<html><body><x-dc><div id="hero"><span class="t" data-comment-id="hit">Hi</span></div></x-dc></body></html>\n'
    );
    expect(out['.thumbnail']).toEqual(binary);
    expect(dec.decode(out['support.js'])).toBe('console.log(1)');
    expect(dec.decode(out['uploads/圖.svg'])).toBe('<svg/>');

    const json = JSON.parse(dec.decode(out[COMMENTS_JSON])) as Comment[];

    expect(json.map(c => [c.commentId, c.anchored])).toEqual([
      ['hit', true],
      ['miss', false],
      ['nofile', false],
    ]);

    const md = dec.decode(out[COMMENTS_MD]);

    expect(md).toContain(`## ${PAGE}`);
    expect(md).toContain('### miss — (unanchored)');
    expect(md).toContain('## ghost.dc.html');
  });

  it('輸出 zip 的 CJK 檔名旗標正確', () => {
    const result = buildExportZip(original(), []);
    const page = listLocalHeaders(result.bytes).find(h => h.name === PAGE);

    expect(page?.utf8).toBe(true);
    expect(result.stats).toEqual({
      total: 0,
      anchored: 0,
      ambiguous: 0,
      unanchored: 0,
    });
  });

  it('不會改動傳入的留言物件', () => {
    const input = comment({ commentId: 'x', elementSelector: '#hero' });
    const result = buildExportZip(original(), [input]);

    expect(input.anchored).toBe(false);
    expect(result.comments[0]?.anchored).toBe(true);
  });
});
