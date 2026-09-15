import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { Comment } from '@core/comments/types';
import { injectCommentIds } from '@core/inject/injectCommentIds';

function fixture(name: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../fixtures/${name}`, import.meta.url)),
    'utf-8'
  );
}

function comment(commentId: string, elementSelector: string | null): Comment {
  return {
    commentId,
    projectId: 'p',
    filePath: 'x.dc.html',
    elementSelector,
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
  };
}

/** 移除注入的屬性後應與原檔逐字相同。 */
function stripInjected(html: string): string {
  return html.replace(/ data-comment-(id|ambiguous)="[^"]*"/g, '');
}

describe('injectCommentIds', () => {
  it('data-comment-anchor 精準命中，且保留 anchor 屬性', () => {
    const html = fixture('page-with-anchor.dc.html');
    const result = injectCommentIds(html, [
      comment('c1', '[data-comment-anchor="a1b2c3d4e5-img-74-16"]'),
    ]);

    expect(result.anchoredIds).toEqual(['c1']);
    expect(result.unanchoredIds).toEqual([]);
    expect(result.html).toContain(
      '<img src="uploads/user-document.svg" alt="" data-comment-anchor="a1b2c3d4e5-img-74-16" style="width:26px; height:26px;" data-comment-id="c1">'
    );
    expect(stripInjected(result.html)).toBe(html);
  });

  it('自閉合標籤在 /> 之前插入', () => {
    const html = fixture('page-with-anchor.dc.html');
    const result = injectCommentIds(html, [
      comment('c9', '[data-comment-anchor="0123456789-input-90-8"]'),
    ]);

    expect(result.html).toContain(
      '<input type="text" data-comment-anchor="0123456789-input-90-8" data-comment-id="c9" />'
    );
    expect(stripInjected(result.html).replace('" />', '"/>')).toBe(html);
  });

  it('一般 CSS selector 命中靜態頁元素', () => {
    const html = fixture('page-css-fallback.dc.html');
    const result = injectCommentIds(html, [
      comment(
        'c2',
        'x-dc > div:nth-child(3) > div:nth-child(2) > div:nth-child(3) > span'
      ),
    ]);

    expect(result.anchoredIds).toEqual(['c2']);
    expect(result.html).toContain(
      '<span style="font-weight:800;" data-comment-id="c2">不打斷作答</span>'
    );
    expect(stripInjected(result.html)).toBe(html);
  });

  it('渲染後的 body > … selector 會補上 x-dc 那一層', () => {
    const html = fixture('page-css-fallback.dc.html');
    const result = injectCommentIds(html, [
      comment('c3', 'body > div:nth-child(2) > div:nth-child(2)'),
    ]);

    expect(result.anchoredIds).toEqual(['c3']);
    expect(result.html).toContain(
      'data-comment-id="c3">學生端作答流程 · 設計規格與決策紀錄</div>'
    );
  });

  it('比對不到、無效 selector、沒有 selector 都歸 unanchored 且不改內容', () => {
    const html = fixture('page-css-fallback.dc.html');
    const result = injectCommentIds(html, [
      comment('miss', 'section.nope > span'),
      comment('bad', '>>> [['),
      comment('none', null),
    ]);

    expect(result.anchoredIds).toEqual([]);
    expect(result.unanchoredIds).toEqual(['miss', 'bad', 'none']);
    expect(result.html).toBe(html);
  });

  it('同一元素多則留言以空白分隔、去重；不同元素各自注入且 offset 不互相干擾', () => {
    const html = fixture('page-with-anchor.dc.html');
    const result = injectCommentIds(html, [
      comment('a', '[data-comment-anchor="f6e5d4c3b2-span"]'),
      comment('b', 'x-dc span'),
      comment('a', '[data-comment-anchor="f6e5d4c3b2-span"]'),
      comment('img1', 'x-dc img'),
    ]);

    expect(result.anchoredIds).toEqual(['a', 'b', 'a', 'img1']);
    expect(result.html).toContain(
      'data-comment-anchor="f6e5d4c3b2-span" style="font-size:21px;" data-comment-id="a b">'
    );
    expect(result.html).toContain('data-comment-id="img1">');
    expect(stripInjected(result.html)).toBe(html);
  });

  it('模板頁（sc-if／sc-for／{{ }}）不會拋錯，命中就注入、否則降級', () => {
    const html = fixture('page-templated.dc.html');
    const result = injectCommentIds(html, [
      comment('canvas', '#proto-canvas'),
      comment('tpl', 'sc-for > div > sc-if > div'),
      comment('nope', 'div.rendered-only'),
    ]);

    expect(result.anchoredIds).toEqual(['canvas', 'tpl']);
    expect(result.unanchoredIds).toEqual(['nope']);
    expect(result.html).toContain(
      '<canvas id="proto-canvas" style="position:absolute; inset:0;" data-comment-id="canvas">'
    );
    expect(result.html).toContain(
      '<div style="{{ st.boxStyle }}" data-comment-id="tpl">'
    );
    expect(stripInjected(result.html)).toBe(html);
  });

  it('既有 data-comment-id 會合併而不是覆蓋或重複', () => {
    const html = fixture('page-idempotent-rerun.dc.html');
    const result = injectCommentIds(html, [
      comment('c2', 'p.lead'),
      comment('c1', '#root > p:first-child'),
    ]);

    expect(result.html).toContain(
      '<p data-comment-id="c1 c2" class="lead">already tagged</p>'
    );
    expect(result.html).toContain('<p class="second">untouched</p>');
    expect((result.html.match(/data-comment-id=/g) ?? []).length).toBe(1);
  });

  it('沒有留言時原樣回傳', () => {
    const html = '<div>x</div>';

    expect(injectCommentIds(html, [])).toEqual({
      html,
      anchoredIds: [],
      ambiguousIds: [],
      unanchoredIds: [],
      candidates: new Map(),
    });
  });
});

describe('injectCommentIds：真實匯出檔與真實留言', () => {
  it('第 10 頁的 (test) 留言透過模板展開命中 user-document 圖示', () => {
    const html = fixture('real-page-10.dc.html');
    const selector =
      '#dc-root > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > img:nth-child(1)';
    const result = injectCommentIds(html, [
      comment('568dae63-11c4-4334-8f6f-e16a3b1795b5', selector),
    ]);

    expect(result.anchoredIds).toEqual([
      '568dae63-11c4-4334-8f6f-e16a3b1795b5',
    ]);
    expect(result.html).toContain(
      '<img src="uploads/user-document.svg" alt="" style="width:26px; height:26px; flex:none;" data-comment-id="568dae63-11c4-4334-8f6f-e16a3b1795b5">'
    );
    expect(stripInjected(result.html)).toBe(html);
  });
});

describe('injectCommentIds：多狀態', () => {
  const stage =
    '#dc-root > div:nth-child(1) > div:nth-child(1) > div:nth-child(2)';
  const cta = `${stage} > div:nth-child(1) > div:nth-child(1) > button:nth-child(2)`;

  it('三個模式都可能是它、描述又沒文字：每個候選都標 id 與 ambiguous', () => {
    const html = fixture('page-two-modes.dc.html');
    const result = injectCommentIds(html, [comment('amb', cta)]);

    expect(result.ambiguousIds).toEqual(['amb']);
    expect(result.anchoredIds).toEqual([]);
    expect(result.candidates.get('amb')).toEqual([
      { tag: 'button', line: 17 },
      { tag: 'button', line: 22 },
      { tag: 'button', line: 12 },
    ]);
    expect(
      (
        result.html.match(
          /<button class="cta" data-comment-id="amb" data-comment-ambiguous="amb">/g
        ) ?? []
      ).length
    ).toBe(3);
    expect(stripInjected(result.html)).toBe(html);
  });

  it('描述帶文字時用文字消歧成唯一命中', () => {
    const html = fixture('page-two-modes.dc.html');
    const withText = {
      ...comment('txt', cta),
      elementDescriptor:
        'dom: body › div#dc-root › … › button[2/2]\ntext: "Join cl…"',
    };
    const result = injectCommentIds(html, [withText]);

    expect(result.anchoredIds).toEqual(['txt']);
    expect(result.candidates.get('txt')).toEqual([{ tag: 'button', line: 12 }]);
    expect(result.html).toContain(
      '<button class="cta" data-comment-id="txt">Join class</button>'
    );
    expect(result.html).not.toContain('data-comment-ambiguous');
  });

  it('同一元素同時是某留言的唯一命中、又是另一則的候選之一', () => {
    const html = fixture('page-two-modes.dc.html');
    const result = injectCommentIds(html, [
      { ...comment('exact', cta), elementDescriptor: 'text: "Continue"' },
      comment('amb', cta),
    ]);

    expect(result.anchoredIds).toEqual(['exact']);
    expect(result.ambiguousIds).toEqual(['amb']);
    expect(result.html).toContain(
      '<button class="cta" data-comment-id="exact amb" data-comment-ambiguous="amb">Continue</button>'
    );
    expect(stripInjected(result.html)).toBe(html);
  });
});

describe('injectCommentIds：真實第 2 頁的 data-dc-tpl 留言', () => {
  it('選到等待畫面的「1 of 10 answered」那個 span', () => {
    const html = fixture('real-page-02.dc.html');
    const selector =
      '#dc-root [data-dc-tpl="643"] :is(h1,h2,h3,h4,h5,h6,p,li,dt,dd,blockquote,figcaption,label,span,a,em,strong,small,td,th,caption) >:is(h1,h2,h3,h4,h5,h6,p,li,dt,dd,blockquote,figcaption,label,span,a,em,strong,small,td,th,caption)';
    const result = injectCommentIds(html, [
      {
        ...comment('6b64df18', selector),
        elementDescriptor:
          'dom: body › div#dc-root › div.sc-host › div › div › div › div › span › span.sc-interp\ntext: "1 of 10 answered"',
      },
    ]);

    expect(result.anchoredIds).toEqual(['6b64df18']);
    expect(result.candidates.get('6b64df18')).toEqual([
      { tag: 'span', line: 604 },
    ]);
    expect(result.html).toContain(
      '<span data-comment-id="6b64df18">{{ waitCountLabel }}</span>'
    );
    expect(stripInjected(result.html)).toBe(html);
  });
});

describe('injectCommentIds：data-comment-anchor 沒匯出時改用 om-id', () => {
  it('第 10 頁的 text-field 留言標到名字輸入列', () => {
    const html = fixture('real-page-10-v2.dc.html');
    const result = injectCommentIds(html, [
      {
        ...comment('746cd058', '[data-comment-anchor="c20e508c07-div"]'),
        elementDescriptor:
          'react:    10 原型_訪客班級流程\ndom:      body › div#dc-root › div.sc-host › div › div › div › div › div › div › div › div[2/2]\nchildren: input, div\nselector: [data-om-id="af6b129d:55"]\nid:       cc-6',
      },
    ]);

    expect(result.anchoredIds).toEqual(['746cd058']);
    expect(result.candidates.get('746cd058')).toEqual([
      { tag: 'div', line: 93 },
    ]);
    expect(stripInjected(result.html)).toBe(html);
  });
});
