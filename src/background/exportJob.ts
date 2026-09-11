import { type FetchLike, listComments } from '@core/comments/connectClient';
import { normalizeComment } from '@core/comments/normalize';
import type { Comment } from '@core/comments/types';
import { type ExportStats, buildExportZip } from '@core/zip/buildExportZip';

export interface ZipDownload {
  bytes: Uint8Array;
  /** 從 Content-Disposition 取得的原始檔名（可能為 null） */
  filename: string | null;
}

export interface ExportJobDeps {
  fetchZip: (
    projectId: string,
    onProgress: (loadedBytes: number) => void
  ) => Promise<ZipDownload>;
  fetchImpl: FetchLike;
  saveZip: (bytes: Uint8Array, filename: string) => Promise<void>;
  onProgress: (progress: string) => Promise<void>;
}

export interface ExportJobResult {
  filename: string;
  stats: ExportStats;
}

export function outputFilename(
  original: string | null,
  projectId: string
): string {
  const base = (original ?? `design-export-${projectId}`).replace(
    /\.zip$/i,
    ''
  );

  return `${base}-with-comments.zip`;
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

/** 匯出流程：下載官方 zip → ListComments → 注入 → 存檔。純協調邏輯，平台呼叫全部注入。 */
export async function runExportJob(
  projectId: string,
  deps: ExportJobDeps
): Promise<ExportJobResult> {
  await deps.onProgress('下載官方匯出檔…');

  let lastReported = 0;
  const zip = await deps.fetchZip(projectId, loaded => {
    if (loaded - lastReported >= 512 * 1024) {
      lastReported = loaded;
      void deps.onProgress(`下載官方匯出檔… ${formatBytes(loaded)}`);
    }
  });

  await deps.onProgress('讀取留言…');

  const raw = await listComments(projectId, deps.fetchImpl);
  const comments = (raw.comments ?? [])
    .map(normalizeComment)
    .filter((c): c is Comment => c !== null);

  await deps.onProgress(`處理 ${comments.length} 則留言…`);

  const built = buildExportZip(zip.bytes, comments);
  const filename = outputFilename(zip.filename, projectId);

  await deps.onProgress('儲存檔案…');
  await deps.saveZip(built.bytes, filename);

  return { filename, stats: built.stats };
}
