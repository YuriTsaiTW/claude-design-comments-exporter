import type { ExportStats } from '@core/zip/buildExportZip';

export type JobState =
  | { status: 'idle' }
  | {
      status: 'running';
      projectId: string;
      progress: string;
      startedAt: number;
    }
  | {
      status: 'done';
      projectId: string;
      filename: string;
      stats: ExportStats;
      finishedAt: number;
    }
  | { status: 'error'; projectId: string; message: string; finishedAt: number };

export const JOB_STATE_KEY = 'exportJob';

export type PopupToWorkerMessage =
  | { type: 'START_EXPORT'; projectId: string }
  | { type: 'GET_JOB_STATE' }
  | { type: 'RESET_JOB_STATE' };

export type WorkerReply =
  { ok: true; state: JobState } | { ok: false; error: string };
