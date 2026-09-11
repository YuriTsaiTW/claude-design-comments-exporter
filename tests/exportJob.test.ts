import { zipSync } from 'fflate';
import { describe, expect, it, vi } from 'vitest';

import { outputFilename, runExportJob } from '../src/background/exportJob';

const enc = new TextEncoder();

function zipBytes(): Uint8Array {
  return zipSync({
    'p.dc.html': enc.encode(
      '<html><body><x-dc><div id="a">x</div></x-dc></body></html>'
    ),
  });
}

describe('outputFilename', () => {
  it('去掉 .zip 後加 -with-comments', () => {
    expect(outputFilename('學生端優化.zip', 'p')).toBe(
      '學生端優化-with-comments.zip'
    );
    expect(outputFilename('已經沒有副檔名', 'p')).toBe(
      '已經沒有副檔名-with-comments.zip'
    );
    expect(outputFilename(null, 'proj-1')).toBe(
      'design-export-proj-1-with-comments.zip'
    );
  });
});

describe('runExportJob', () => {
  it('依序下載、讀留言、注入、存檔，並回報進度', async () => {
    const progress: string[] = [];
    const saveZip = vi.fn(async () => undefined);
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            comments: [
              {
                commentId: 'c1',
                filePath: 'p.dc.html',
                elementSelector: '#a',
                body: 'hi',
              },
              { notValid: true },
            ],
          }),
          { status: 200 }
        )
    );
    const fetchZip = vi.fn(
      async (_id: string, onProgress: (n: number) => void) => {
        onProgress(1024 * 1024);

        return { bytes: zipBytes(), filename: 'orig.zip' };
      }
    );

    const result = await runExportJob('p1', {
      fetchZip,
      fetchImpl,
      saveZip,
      onProgress: async p => {
        progress.push(p);
      },
    });

    expect(result).toEqual({
      filename: 'orig-with-comments.zip',
      stats: { total: 1, anchored: 1, ambiguous: 0, unanchored: 0 },
    });
    expect(saveZip).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      'orig-with-comments.zip'
    );
    expect(progress).toEqual([
      '下載官方匯出檔…',
      '下載官方匯出檔… 1.0 MB',
      '讀取留言…',
      '處理 1 則留言…',
      '儲存檔案…',
    ]);
  });

  it('留言 API 失敗時不會存檔', async () => {
    const saveZip = vi.fn(async () => undefined);

    await expect(
      runExportJob('p1', {
        fetchZip: async () => ({ bytes: zipBytes(), filename: null }),
        fetchImpl: async () =>
          new Response('{"code":"permission_denied","message":"no"}', {
            status: 403,
          }),
        saveZip,
        onProgress: async () => undefined,
      })
    ).rejects.toMatchObject({ code: 'permission_denied' });
    expect(saveZip).not.toHaveBeenCalled();
  });
});
