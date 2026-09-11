import { describe, expect, it } from 'vitest';

import { resolveFilePath } from '@core/inject/resolveFilePath';

const entries = [
  '10 原型_訪客班級流程.dc.html',
  'support.js',
  'uploads/user-document.svg',
  'sub/page.dc.html',
];

describe('resolveFilePath', () => {
  it('完全相符', () => {
    expect(resolveFilePath('support.js', entries)).toBe('support.js');
  });

  it('容許 ./ 與前導斜線', () => {
    expect(resolveFilePath('./sub/page.dc.html', entries)).toBe(
      'sub/page.dc.html'
    );
    expect(resolveFilePath('/sub/page.dc.html', entries)).toBe(
      'sub/page.dc.html'
    );
  });

  it('NFD 與 NFC 互相對得上', () => {
    const nfd = '10 原型_訪客班級流程.dc.html'.normalize('NFD');

    expect(resolveFilePath(nfd, entries)).toBe('10 原型_訪客班級流程.dc.html');
  });

  it('找不到完整路徑時退回 basename', () => {
    expect(resolveFilePath('page.dc.html', entries)).toBe('sub/page.dc.html');
  });

  it('都找不到與空值回 null', () => {
    expect(resolveFilePath('nope.dc.html', entries)).toBeNull();
    expect(resolveFilePath('', entries)).toBeNull();
    expect(resolveFilePath(null, entries)).toBeNull();
  });
});
