import { describe, expect, it } from 'vitest';

import { parseContentDispositionFilename } from '@core/contentDisposition';

describe('parseContentDispositionFilename', () => {
  it('優先解析 RFC 5987 的 filename*', () => {
    expect(
      parseContentDispositionFilename(
        'attachment; filename="fallback.zip"; filename*=UTF-8\'\'%E5%AD%B8%E7%94%9F.zip'
      )
    ).toBe('學生.zip');
  });

  it('解析引號 filename 並處理跳脫字元', () => {
    expect(
      parseContentDispositionFilename(
        'attachment; filename="my \\"file\\".zip"'
      )
    ).toBe('my "file".zip');
  });

  it('解析裸值 filename', () => {
    expect(
      parseContentDispositionFilename('attachment; filename=plain.zip')
    ).toBe('plain.zip');
  });

  it('percent-decoding 失敗時回原字串', () => {
    expect(
      parseContentDispositionFilename("attachment; filename*=UTF-8''%E0%A4%A")
    ).toBe('%E0%A4%A');
  });

  it('空值回 null', () => {
    expect(parseContentDispositionFilename(null)).toBeNull();
    expect(parseContentDispositionFilename('inline')).toBeNull();
  });
});
