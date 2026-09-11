import { parseContentDispositionFilename } from '@core/contentDisposition';

import type { ZipDownload } from '../background/exportJob';
import { JOB_STATE_KEY, type JobState } from '../types/messages';

export const DOWNLOAD_URL = (projectId: string): string =>
  `https://claude.ai/design/v1/design/projects/${encodeURIComponent(projectId)}/download`;

/** 在 service worker 直接以 cookie 下載官方 zip，邊讀邊回報進度（也順便讓 SW 保持活著）。 */
export async function fetchZipWithCookies(
  projectId: string,
  onProgress: (loaded: number) => void
): Promise<ZipDownload> {
  const response = await fetch(DOWNLOAD_URL(projectId), {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(
      `下載官方匯出檔失敗（HTTP ${response.status}）。請確認你已登入 claude.ai 且有這個專案的權限。`
    );
  }

  const filename = parseContentDispositionFilename(
    response.headers.get('content-disposition')
  );
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());

    return { bytes, filename };
  }

  const reader = response.body.getReader();

  for (;;) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    chunks.push(value);
    loaded += value.byteLength;
    onProgress(loaded);
  }

  const bytes = new Uint8Array(loaded);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { bytes, filename };
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000;

  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }

  return btoa(binary);
}

/** MV3 service worker 沒有 URL.createObjectURL，改用 data: URL 交給 chrome.downloads。 */
export async function saveZipViaDownloads(
  bytes: Uint8Array,
  filename: string
): Promise<void> {
  await chrome.downloads.download({
    url: `data:application/zip;base64,${toBase64(bytes)}`,
    filename,
    saveAs: false,
    conflictAction: 'uniquify',
  });
}

export async function getJobState(): Promise<JobState> {
  const stored = await chrome.storage.session.get(JOB_STATE_KEY);
  const state = stored[JOB_STATE_KEY] as JobState | undefined;

  return state ?? { status: 'idle' };
}

export async function setJobState(state: JobState): Promise<void> {
  await chrome.storage.session.set({ [JOB_STATE_KEY]: state });
}

export function onJobStateChanged(
  callback: (state: JobState) => void
): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string
  ): void => {
    if (area !== 'session') {
      return;
    }

    const change = changes[JOB_STATE_KEY];

    if (change) {
      callback((change.newValue as JobState | undefined) ?? { status: 'idle' });
    }
  };

  chrome.storage.onChanged.addListener(listener);

  return () => chrome.storage.onChanged.removeListener(listener);
}

export async function getActiveTabUrl(): Promise<string | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  return tab?.url ?? null;
}
