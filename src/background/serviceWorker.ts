import {
  fetchZipWithCookies,
  getJobState,
  saveZipViaDownloads,
  setJobState,
} from '@platform/chrome';

import type { PopupToWorkerMessage, WorkerReply } from '../types/messages';
import { runExportJob } from './exportJob';

async function startExport(projectId: string): Promise<WorkerReply> {
  const current = await getJobState();

  if (current.status === 'running') {
    return { ok: false, error: '已有一個匯出正在進行中。' };
  }

  const running = {
    status: 'running',
    projectId,
    progress: '準備中…',
    startedAt: Date.now(),
  } as const;

  await setJobState(running);

  void (async () => {
    try {
      const result = await runExportJob(projectId, {
        fetchZip: fetchZipWithCookies,
        fetchImpl: (input, init) => fetch(input, init),
        saveZip: saveZipViaDownloads,
        onProgress: progress => setJobState({ ...running, progress }),
      });

      await setJobState({
        status: 'done',
        projectId,
        filename: result.filename,
        stats: result.stats,
        finishedAt: Date.now(),
      });
    } catch (error) {
      await setJobState({
        status: 'error',
        projectId,
        message: error instanceof Error ? error.message : String(error),
        finishedAt: Date.now(),
      });
    }
  })();

  return { ok: true, state: running };
}

chrome.runtime.onMessage.addListener(
  (
    message: PopupToWorkerMessage,
    _sender,
    sendResponse: (reply: WorkerReply) => void
  ) => {
    void (async () => {
      try {
        switch (message.type) {
          case 'START_EXPORT':
            sendResponse(await startExport(message.projectId));

            break;
          case 'GET_JOB_STATE':
            sendResponse({ ok: true, state: await getJobState() });

            break;
          case 'RESET_JOB_STATE':
            await setJobState({ status: 'idle' });
            sendResponse({ ok: true, state: { status: 'idle' } });

            break;
          default:
            sendResponse({ ok: false, error: '未知的訊息' });
        }
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();

    return true;
  }
);
