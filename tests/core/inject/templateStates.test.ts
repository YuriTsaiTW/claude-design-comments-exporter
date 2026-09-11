import { selectOne } from 'css-select';
import type { Element, Node } from 'domhandler';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
import { adapter } from 'parse5-htmlparser2-tree-adapter';
import { describe, expect, it } from 'vitest';

import {
  parseChain,
  renderedVariants,
  resolveChainCandidates,
} from '@core/inject/templateStates';

function fixture(name: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../fixtures/${name}`, import.meta.url)),
    'utf-8'
  );
}

function docOf(html: string) {
  return parse(html, { treeAdapter: adapter, sourceCodeLocationInfo: true });
}

function lines(
  html: string,
  elements: { sourceCodeLocation?: unknown }[]
): number[] {
  return elements.map(
    e =>
      (e.sourceCodeLocation as { startTag: { startLine: number } }).startTag
        .startLine
  );
}

const STAGE =
  '#dc-root > div:nth-child(1) > div:nth-child(1) > div:nth-child(2)';

describe('parseChain', () => {
  it('拆解 Claude Design 的 nth-child 鏈', () => {
    expect(
      parseChain('#dc-root > div:nth-child(1) > img:nth-child(2)')
    ).toEqual([
      { tag: null, id: 'dc-root', classes: [], nth: null },
      { tag: 'div', id: null, classes: [], nth: 1 },
      { tag: 'img', id: null, classes: [], nth: 2 },
    ]);
    expect(parseChain('body > div.sc-host > DIV#x.a.b')).toEqual([
      { tag: 'body', id: null, classes: [], nth: null },
      { tag: 'div', id: null, classes: ['sc-host'], nth: null },
      { tag: 'div', id: 'x', classes: ['a', 'b'], nth: null },
    ]);
  });

  it('不是純 > 串接或含其他偽類就回 null', () => {
    expect(parseChain('div span')).toBeNull();
    expect(parseChain('div:first-child')).toBeNull();
    expect(parseChain('[data-x="1"]')).toBeNull();
    expect(parseChain('div > > span')).toBeNull();
  });
});

describe('renderedVariants', () => {
  it('sc-if 產生開／關兩種，預設狀態排第一', () => {
    const doc = docOf(
      '<x-dc><sc-if hint-placeholder-val="{{ false }}"><div id="a"></div></sc-if><p id="b"></p></x-dc>'
    );
    const template = selectOne<Node, Element>('x-dc', doc) as Element;
    const variants = renderedVariants(template.children, 2);

    expect(variants.map(v => v.map(c => c.id))).toEqual([['b'], ['a', 'b']]);
  });

  it('sc-for 依需要的序號列舉次數，預設次數排第一', () => {
    const doc = docOf(
      '<x-dc><sc-for hint-placeholder-count="3"><li></li></sc-for><p id="after"></p></x-dc>'
    );
    const template = selectOne<Node, Element>('x-dc', doc) as Element;
    const variants = renderedVariants(template.children, 2);

    expect(variants.map(v => v.length)).toEqual([4, 1, 2, 3]);
  });
});

describe('resolveChainCandidates', () => {
  it('同一路徑在三個模式各對到不同卡片，全部列為候選且預設狀態（identify）排第一', () => {
    const html = fixture('page-two-modes.dc.html');
    const found = resolveChainCandidates(
      docOf(html),
      `${STAGE} > div:nth-child(1) > div:nth-child(1) > button:nth-child(2)`
    );

    expect(found.map(e => e.attribs['class'])).toEqual(['cta', 'cta', 'cta']);
    expect(lines(html, found)).toEqual([17, 22, 12]);
  });

  it('路徑經過 sc-for 之後的元素，次數不同也找得到', () => {
    const html = fixture('page-two-modes.dc.html');
    // topbar 的第 4 個 chip：placeholder 只有 2 個，需要列舉到 4 次
    const found = resolveChainCandidates(
      docOf(html),
      '#dc-root > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > span:nth-child(4)'
    );

    expect(found.map(e => e.attribs['class'])).toEqual(['chip']);
  });

  it('以模板內的 id 起頭', () => {
    const html = fixture('page-two-modes.dc.html');
    const found = resolveChainCandidates(
      docOf(html),
      '#app > div:nth-child(1) > span:nth-child(1)'
    );

    expect(found.map(e => e.attribs['class'])).toEqual(['chip']);
  });

  it('真實第 10 頁的留言路徑只對到一個元素', () => {
    const html = fixture('real-page-10.dc.html');
    const found = resolveChainCandidates(
      docOf(html),
      '#dc-root > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > img:nth-child(1)'
    );

    expect(found.map(e => e.attribs['src'])).toEqual([
      'uploads/user-document.svg',
    ]);
  });

  it('對不到與解析不了都回空', () => {
    const doc = docOf(fixture('page-two-modes.dc.html'));

    expect(
      resolveChainCandidates(doc, `${STAGE} > section:nth-child(1)`)
    ).toEqual([]);
    expect(resolveChainCandidates(doc, 'div span')).toEqual([]);
    expect(resolveChainCandidates(doc, '#nope > div')).toEqual([]);
  });
});

describe('resolveChainCandidates：文字插值算成渲染後的子元素', () => {
  it('插值 span 會讓後面的兄弟序號往後移，選到插值時映射回所在元素', () => {
    const html =
      '<html><body><x-dc><div id="w">{{ a }}<b id="b">x</b></div></x-dc></body></html>';
    const doc = docOf(html);
    const base = '#dc-root > div:nth-child(1) > div:nth-child(1)';

    expect(
      resolveChainCandidates(doc, `${base} > b:nth-child(2)`).map(
        e => e.attribs['id']
      )
    ).toEqual(['b']);
    expect(resolveChainCandidates(doc, `${base} > b:nth-child(1)`)).toEqual([]);
    expect(
      resolveChainCandidates(doc, `${base} > span:nth-child(1)`).map(
        e => e.attribs['id']
      )
    ).toEqual(['w']);
  });
});
