import { parseProjectId } from '@core/url';

import {
  getActiveTabUrl,
  getJobState,
  onJobStateChanged,
} from '@platform/chrome';

import type {
  JobState,
  PopupToWorkerMessage,
  WorkerReply,
} from '../types/messages';
import {
  type PopupEvent,
  type PopupState,
  initialPopupState,
  popupReducer,
} from './popupReducer';

const hint = document.getElementById('hint') as HTMLParagraphElement;
const exportButton = document.getElementById('export') as HTMLButtonElement;
const status = document.getElementById('status') as HTMLElement;
const resetButton = document.getElementById('reset') as HTMLButtonElement;

let state: PopupState = initialPopupState;
let projectId: string | null = null;

function setStatus(
  kind: 'loading' | 'success' | 'error' | null,
  nodes: (Node | string)[]
): void {
  status.replaceChildren(...nodes);
  status.hidden = kind === null;

  if (kind) {
    status.dataset['kind'] = kind;
  } else {
    delete status.dataset['kind'];
  }
}

function render(): void {
  switch (state.status) {
    case 'idle':
      hint.textContent = state.canExport
        ? '會下載官方 zip，並加入 comments.json／comments.md。'
        : '請先開啟 claude.ai/design 的專案頁面（/design/p/…）。';
      exportButton.disabled = !state.canExport;
      exportButton.hidden = false;
      resetButton.hidden = true;
      setStatus(null, []);

      break;
    case 'loading': {
      const spinner = document.createElement('span');

      spinner.className = 'spinner';
      spinner.setAttribute('aria-hidden', 'true');
      hint.textContent = '可以關閉這個視窗，匯出會在背景繼續。';
      exportButton.disabled = true;
      exportButton.hidden = false;
      resetButton.hidden = true;
      setStatus('loading', [spinner, state.progress]);

      break;
    }
    case 'success': {
      const { anchored, ambiguous, unanchored, total } = state.stats;
      const strong = document.createElement('strong');

      strong.textContent = state.filename;
      hint.textContent = '已交給 Chrome 下載。';
      exportButton.hidden = true;
      resetButton.hidden = false;
      setStatus('success', [
        '已匯出 ',
        strong,
        `。留言 ${total} 則：唯一定位 ${anchored}、多候選 ${ambiguous}、未定位 ${unanchored}。`,
      ]);

      break;
    }
    case 'error':
      hint.textContent = '匯出失敗。';
      exportButton.hidden = true;
      resetButton.hidden = false;
      setStatus('error', [state.message]);

      break;
    default:
      break;
  }
}

function dispatch(event: PopupEvent): void {
  state = popupReducer(state, event);
  render();
}

function eventFromJobState(job: JobState): PopupEvent | null {
  switch (job.status) {
    case 'running':
      return { type: 'JOB_PROGRESS', progress: job.progress };
    case 'done':
      return { type: 'JOB_SUCCESS', filename: job.filename, stats: job.stats };
    case 'error':
      return { type: 'JOB_ERROR', message: job.message };
    default:
      return null;
  }
}

async function send(message: PopupToWorkerMessage): Promise<WorkerReply> {
  return (await chrome.runtime.sendMessage(message)) as WorkerReply;
}

async function init(): Promise<void> {
  const url = await getActiveTabUrl();

  projectId = parseProjectId(url);
  dispatch({ type: 'TAB_CHECKED', isDesignProjectPage: projectId !== null });

  const job = await getJobState();

  if (job.status === 'running') {
    // 接回進行中的工作：先切到 loading 再套用進度
    state = { status: 'loading', progress: job.progress };
    render();
  } else {
    const event = eventFromJobState(job);

    if (event) {
      dispatch(event);
    }
  }

  onJobStateChanged(next => {
    if (next.status === 'running' && state.status !== 'loading') {
      state = { status: 'loading', progress: next.progress };
      render();

      return;
    }

    const event = eventFromJobState(next);

    if (event) {
      dispatch(event);
    }
  });
}

exportButton.addEventListener('click', () => {
  if (!projectId || state.status !== 'idle') {
    return;
  }

  dispatch({ type: 'EXPORT_CLICKED' });
  void (async () => {
    const reply = await send({ type: 'START_EXPORT', projectId });

    if (!reply.ok) {
      dispatch({ type: 'JOB_ERROR', message: reply.error });
    }
  })();
});

resetButton.addEventListener('click', () => {
  void (async () => {
    await send({ type: 'RESET_JOB_STATE' });
    dispatch({ type: 'RESET' });
    dispatch({ type: 'TAB_CHECKED', isDesignProjectPage: projectId !== null });
  })();
});

void init().catch((error: unknown) => {
  dispatch({
    type: 'JOB_ERROR',
    message: error instanceof Error ? error.message : String(error),
  });
});
