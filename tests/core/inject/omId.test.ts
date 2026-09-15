import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
import { adapter } from 'parse5-htmlparser2-tree-adapter';
import { describe, expect, it } from 'vitest';

import { descriptorLeaf, parseOmId } from '@core/inject/descriptor';
import { expandTemplate } from '@core/inject/expandTemplate';
import { resolveOmIdCandidates } from '@core/inject/omId';

function fixture(name: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../fixtures/${name}`, import.meta.url)),
    'utf-8'
  );
}

function resolve(name: string, descriptor: string): number[] {
  const doc = parse(fixture(name), {
    treeAdapter: adapter,
    sourceCodeLocationInfo: true,
  });
  const om = parseOmId(descriptor);

  if (!om) {
    throw new Error('no om-id');
  }

  return resolveOmIdCandidates(doc, om.index, descriptorLeaf(descriptor), all =>
    expandTemplate(doc, { allBranches: all })
  ).map(
    e =>
      (e as { sourceCodeLocation?: { startTag: { startLine: number } } })
        .sourceCodeLocation!.startTag.startLine
  );
}

describe('parseOmId / descriptorLeaf', () => {
  it('解析 om-id 與 dom 末段', () => {
    expect(parseOmId('[data-om-id="af6b129d:55"]')).toEqual({
      hash: 'af6b129d',
      index: 55,
    });
    expect(
      parseOmId('dom: x\nselector: [data-om-id="86c90037:47"]\nid: cc-2')
    ).toEqual({ hash: '86c90037', index: 47 });
    expect(parseOmId('[data-comment-anchor="x"]')).toBeNull();
    expect(
      descriptorLeaf(
        'dom:      body › div#dc-root › div.sc-host › div › div.scp0[2/2]'
      )
    ).toEqual({
      tag: 'div',
      classes: ['scp0'],
      position: { index: 2, total: 2 },
      parentTag: 'div',
      children: null,
    });
    expect(
      descriptorLeaf('dom: body › div\nchildren: input, div')?.children
    ).toEqual(['input', 'div']);
    expect(
      descriptorLeaf('dom: body › span\nchildren: text')?.children
    ).toEqual(['text']);
    expect(descriptorLeaf('dom: body › svg › path[2/6]')?.parentTag).toBe(
      'svg'
    );
    expect(descriptorLeaf('dom: body › img')?.position).toBeNull();
    expect(descriptorLeaf('text: "x"')).toBeNull();
  });
});

describe('resolveOmIdCandidates：真實留言（2026-09-14／15 匯出）', () => {
  it('第 10 頁三則 data-comment-anchor 留言靠 om-id 對到來源行', () => {
    expect(
      resolve(
        'real-page-10-v2.dc.html',
        'dom: body › div#dc-root › div.sc-host › div › div › div › div › div › div[3/4]\ntext: "Your name in class"\nselector: [data-om-id="af6b129d:49"]'
      )
    ).toEqual([88]);
    expect(
      resolve(
        'real-page-10-v2.dc.html',
        'dom: body › div#dc-root › div.sc-host › div › div › div › div › div › div › div › div[2/2]\nchildren: input, div\nselector: [data-om-id="af6b129d:55"]'
      )
    ).toEqual([93]);
    expect(
      resolve(
        'real-page-10-v2.dc.html',
        'dom: body › div#dc-root › div.sc-host › div › div › div › div › div › div › div › div › div.scp0[2/2]\nchildren: svg\nselector: [data-om-id="af6b129d:57"]'
      )
    ).toEqual([95]);
  });

  it('第 11 頁的 path[2/6] 用描述位置選出第二個 path，而不是位移 2 指到的第一個', () => {
    expect(
      resolve(
        'real-page-11.dc.html',
        'dom: body › div#dc-root › div.sc-host › div › div › div › div › div › div › svg › path[2/6]\nselector: [data-om-id="86c90037:47"]'
      )
    ).toEqual([106]);
  });

  it('舊版第 10 頁的 img[1/2] 留言', () => {
    expect(
      resolve(
        'real-page-10.dc.html',
        'dom: body › div#dc-root › div.sc-host › div › div › div › div › div › div › div › img[1/2]\nselector: [data-om-id="710b3422:41"]'
      )
    ).toEqual([74]);
  });

  it('沒有描述時只信位移 2', () => {
    expect(
      resolve('real-page-11.dc.html', 'selector: [data-om-id="86c90037:47"]')
    ).toEqual([105]);
  });
});
