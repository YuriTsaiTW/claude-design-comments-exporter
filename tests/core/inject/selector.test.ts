import { describe, expect, it } from 'vitest';

import { classifySelector } from '@core/inject/selector';

describe('classifySelector', () => {
  it('辨識 data-comment-anchor 精準錨點', () => {
    expect(
      classifySelector('[data-comment-anchor="a1b2c3d4e5-div-12-4"]')
    ).toEqual({
      kind: 'anchor',
      anchor: 'a1b2c3d4e5-div-12-4',
      selector: '[data-comment-anchor="a1b2c3d4e5-div-12-4"]',
    });
  });

  it('其他字串視為 CSS selector', () => {
    expect(classifySelector(' body > div:nth-child(2) span ')).toEqual({
      kind: 'css',
      selector: 'body > div:nth-child(2) span',
    });
  });

  it('空值視為 none', () => {
    expect(classifySelector(null)).toEqual({ kind: 'none' });
    expect(classifySelector('   ')).toEqual({ kind: 'none' });
  });
});
