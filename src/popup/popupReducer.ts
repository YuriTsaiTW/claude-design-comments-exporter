export interface ExportStats {
  total: number;
  anchored: number;
  ambiguous: number;
  unanchored: number;
}

export type PopupState =
  | { status: 'idle'; canExport: boolean }
  | { status: 'loading'; progress: string }
  | { status: 'success'; filename: string; stats: ExportStats }
  | { status: 'error'; message: string };

export type PopupEvent =
  | { type: 'TAB_CHECKED'; isDesignProjectPage: boolean }
  | { type: 'EXPORT_CLICKED' }
  | { type: 'JOB_PROGRESS'; progress: string }
  | { type: 'JOB_SUCCESS'; filename: string; stats: ExportStats }
  | { type: 'JOB_ERROR'; message: string }
  | { type: 'RESET' };

export const initialPopupState: PopupState = {
  status: 'idle',
  canExport: false,
};

/** popup 的純狀態機：idle → loading → success | error → idle。 */
export function popupReducer(state: PopupState, event: PopupEvent): PopupState {
  switch (event.type) {
    case 'TAB_CHECKED':
      return state.status === 'idle'
        ? { status: 'idle', canExport: event.isDesignProjectPage }
        : state;
    case 'EXPORT_CLICKED':
      return state.status === 'idle' && state.canExport
        ? { status: 'loading', progress: '準備中…' }
        : state;
    case 'JOB_PROGRESS':
      return state.status === 'loading'
        ? { status: 'loading', progress: event.progress }
        : state;
    case 'JOB_SUCCESS':
      return {
        status: 'success',
        filename: event.filename,
        stats: event.stats,
      };
    case 'JOB_ERROR':
      return { status: 'error', message: event.message };
    case 'RESET':
      return initialPopupState;
    default:
      return state;
  }
}
