import { describe, expect, it } from 'vitest';

import { parseProjectId } from '@core/url';

describe('parseProjectId', () => {
  it('解析標準專案頁網址', () => {
    expect(parseProjectId('https://claude.ai/design/p/abc-123')).toBe(
      'abc-123'
    );
  });

  it('容許尾端斜線與 query string', () => {
    expect(parseProjectId('https://claude.ai/design/p/abc/')).toBe('abc');
    expect(
      parseProjectId('https://claude.ai/design/p/abc?tab=comments#x')
    ).toBe('abc');
  });

  it('非 claude.ai、非 https、非專案路徑都回 null', () => {
    expect(parseProjectId('https://example.com/design/p/abc')).toBeNull();
    expect(parseProjectId('http://claude.ai/design/p/abc')).toBeNull();
    expect(parseProjectId('https://claude.ai/design')).toBeNull();
    expect(parseProjectId('https://claude.ai/design/p/abc/files')).toBeNull();
  });

  it('空值與非網址回 null', () => {
    expect(parseProjectId(null)).toBeNull();
    expect(parseProjectId(undefined)).toBeNull();
    expect(parseProjectId('not a url')).toBeNull();
  });
});
