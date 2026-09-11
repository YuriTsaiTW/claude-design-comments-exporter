import { selectOne } from 'css-select';
import type { Element, Node } from 'domhandler';
import { parse } from 'parse5';
import { adapter } from 'parse5-htmlparser2-tree-adapter';
import { describe, expect, it } from 'vitest';

import { expandTemplate } from '@core/inject/expandTemplate';

function expand(html: string) {
  const doc = parse(html, {
    treeAdapter: adapter,
    sourceCodeLocationInfo: true,
  });

  return expandTemplate(doc);
}

function pick(html: string, selector: string): Element | null {
  const { document, sourceOf } = expand(html);
  const hit = selectOne<Node, Element>(selector, document);

  return hit ? (sourceOf.get(hit) ?? null) : null;
}

describe('expandTemplate', () => {
  it('把 x-dc 的子節點放進 #dc-root > .sc-host，並移除 helmet', () => {
    const html =
      '<html><body><x-dc><helmet><style>a{}</style></helmet><div id="a"></div><div id="b"></div></x-dc></body></html>';

    expect(
      pick(html, '#dc-root > div:nth-child(1) > div:nth-child(1)')?.attribs[
        'id'
      ]
    ).toBe('a');
    expect(
      pick(html, '#dc-root > div:nth-child(1) > div:nth-child(2)')?.attribs[
        'id'
      ]
    ).toBe('b');
    expect(pick(html, 'style')).toBeNull();
  });

  it('sc-if 為 false 整段移除、true 或缺省原地提升', () => {
    const html = `<html><body><x-dc>
      <sc-if value="{{ a }}" hint-placeholder-val="{{ false }}"><div id="hidden"></div></sc-if>
      <sc-if value="{{ b }}" hint-placeholder-val="{{ true }}"><div id="shown"></div></sc-if>
      <sc-if value="{{ c }}"><div id="default"></div></sc-if>
    </x-dc></body></html>`;

    expect(pick(html, '.sc-host > div:nth-child(1)')?.attribs['id']).toBe(
      'shown'
    );
    expect(pick(html, '.sc-host > div:nth-child(2)')?.attribs['id']).toBe(
      'default'
    );
    expect(pick(html, '#hidden')).toBeNull();
    expect(pick(html, 'sc-if')).toBeNull();
  });

  it('sc-for 依 hint-placeholder-count 重複，0 則一個都沒有，缺省一次', () => {
    const html = `<html><body><x-dc>
      <ul id="list"><sc-for list="{{ xs }}" as="x" hint-placeholder-count="3"><li class="item">{{ x }}</li></sc-for></ul>
      <ul id="empty"><sc-for list="{{ ys }}" as="y" hint-placeholder-count="0"><li>y</li></sc-for></ul>
      <ul id="one"><sc-for list="{{ zs }}" as="z"><li>z</li></sc-for></ul>
      <p id="after"></p>
    </x-dc></body></html>`;
    const { document } = expand(html);
    const count = (sel: string) => {
      let n = 0;

      while (selectOne<Node, Element>(`${sel}:nth-child(${n + 1})`, document)) {
        n += 1;
      }

      return n;
    };

    expect(count('#list > li')).toBe(3);
    expect(count('#empty > li')).toBe(0);
    expect(count('#one > li')).toBe(1);
    expect(pick(html, '.sc-host > p:nth-child(4)')?.attribs['id']).toBe(
      'after'
    );
    expect(pick(html, '#list > li:nth-child(3)')?.attribs['class']).toBe(
      'item'
    );
  });

  it('巢狀模板也能展開，且映射回同一個來源元素', () => {
    const html = `<html><body><x-dc><div id="root">
      <sc-for list="{{ rows }}" as="r" hint-placeholder-count="2">
        <div class="row"><sc-if value="{{ r.on }}" hint-placeholder-val="{{ true }}"><span class="cell">c</span></sc-if></div>
      </sc-for>
    </div></x-dc></body></html>`;
    const { document, sourceOf } = expand(html);
    const resolve = (selector: string) => {
      const hit = selectOne<Node, Element>(selector, document);

      return hit ? (sourceOf.get(hit) ?? null) : null;
    };
    const first = resolve('#root > div:nth-child(1) > span');
    const second = resolve('#root > div:nth-child(2) > span');

    expect(first?.attribs['class']).toBe('cell');
    expect(second).toBe(first);
  });

  it('沒有 x-dc 時退回 body', () => {
    expect(
      pick(
        '<html><body><div id="plain"></div></body></html>',
        '#dc-root > .sc-host > div'
      )?.attribs['id']
    ).toBe('plain');
  });
});

describe('expandTemplate：data-dc-tpl 與 sc-interp', () => {
  const html = `<html><body><x-dc>
    <helmet><style>a{}</style></helmet>
    <div id="a">{{ x }} and {{ y }}<b id="b">{{ z }}</b></div>
    <sc-if value="{{ off }}" hint-placeholder-val="{{ false }}"><p id="hidden">{{ t }}</p></sc-if>
  </x-dc></body></html>`;

  it('依前序走訪編號，helmet 子樹也算，sc-if 本身也占號', () => {
    const { document, sourceOf } = expand(html);
    const a = selectOne<Node, Element>('[data-dc-tpl="2"]', document);
    const b = selectOne<Node, Element>('[data-dc-tpl="3"]', document);

    expect(sourceOf.get(a as Element)?.attribs['id']).toBe('a');
    expect(sourceOf.get(b as Element)?.attribs['id']).toBe('b');
    expect(selectOne<Node, Element>('[data-dc-tpl="0"]', document)).toBeNull();
  });

  it('文字插值變成 span.sc-interp 並映射回所在元素', () => {
    const { document, sourceOf } = expand(html);
    const interps = [1, 2, 3].map(n =>
      selectOne<Node, Element>(`#a > span.sc-interp:nth-child(${n})`, document)
    );

    expect(interps.map(i => sourceOf.get(i as Element)?.attribs['id'])).toEqual(
      ['a', 'a', undefined]
    );
    expect(
      selectOne<Node, Element>('#a > b:nth-child(3)', document)
    ).not.toBeNull();
    expect(
      sourceOf.get(
        selectOne<Node, Element>('#b > span.sc-interp', document) as Element
      )?.attribs['id']
    ).toBe('b');
  });

  it('allBranches 時關閉的 sc-if 也展開', () => {
    const doc = parse(html, {
      treeAdapter: adapter,
      sourceCodeLocationInfo: true,
    });

    expect(
      selectOne<Node, Element>('#hidden', expandTemplate(doc).document)
    ).toBeNull();
    expect(
      selectOne<Node, Element>(
        '#hidden',
        expandTemplate(doc, { allBranches: true }).document
      )
    ).not.toBeNull();
  });
});
