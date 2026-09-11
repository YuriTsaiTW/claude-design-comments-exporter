import { selectAll } from 'css-select';
import type { Element, Node } from 'domhandler';
import { parse } from 'parse5';
import { adapter } from 'parse5-htmlparser2-tree-adapter';
import { describe, expect, it } from 'vitest';

import {
  descriptorText,
  disambiguateByText,
  elementText,
} from '@core/inject/descriptor';

const html =
  '<div><p class="a">Join <b>your</b> class</p><p class="b">Pick your character</p><p class="c">{{ title }}</p></div>';
const doc = parse(html, { treeAdapter: adapter });
const ps = selectAll<Node, Element>('p', doc);

describe('descriptorText', () => {
  it('取出 text 行並去掉省略號', () => {
    expect(descriptorText('dom: div › p\ntext: "Pick your…"\nid: cc-1')).toBe(
      'Pick your'
    );
    expect(descriptorText('dom: div › p')).toBeNull();
    expect(descriptorText(null)).toBeNull();
    expect(descriptorText('text: ""')).toBeNull();
  });
});

describe('elementText', () => {
  it('合併子孫文字並壓縮空白', () => {
    expect(elementText(ps[0] as Element)).toBe('Join your class');
  });
});

describe('disambiguateByText', () => {
  it('用文字片段留下唯一候選', () => {
    expect(disambiguateByText(ps, 'text: "Pick your char…"')).toEqual([ps[1]]);
  });

  it('沒有文字、只有一個候選、或篩到零個時維持原候選', () => {
    expect(disambiguateByText(ps, 'dom: div')).toEqual(ps);
    expect(disambiguateByText([ps[0] as Element], 'text: "zzz"')).toEqual([
      ps[0],
    ]);
    expect(disambiguateByText(ps, 'text: "not in any"')).toEqual(ps);
  });
});
