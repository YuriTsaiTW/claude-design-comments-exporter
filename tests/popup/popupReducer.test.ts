import { describe, expect, it } from 'vitest';

import { initialPopupState, popupReducer } from '../../src/popup/popupReducer';

const stats = { total: 2, anchored: 1, ambiguous: 0, unanchored: 1 };

describe('popupReducer', () => {
  it('idle → loading → success', () => {
    let state = popupReducer(initialPopupState, {
      type: 'TAB_CHECKED',
      isDesignProjectPage: true,
    });

    expect(state).toEqual({ status: 'idle', canExport: true });
    state = popupReducer(state, { type: 'EXPORT_CLICKED' });
    expect(state).toEqual({ status: 'loading', progress: '準備中…' });
    state = popupReducer(state, { type: 'JOB_PROGRESS', progress: '下載中' });
    expect(state).toEqual({ status: 'loading', progress: '下載中' });
    state = popupReducer(state, {
      type: 'JOB_SUCCESS',
      filename: 'x.zip',
      stats,
    });
    expect(state).toEqual({ status: 'success', filename: 'x.zip', stats });
  });

  it('loading → error，RESET 回 idle', () => {
    const loading = popupReducer(
      { status: 'idle', canExport: true },
      { type: 'EXPORT_CLICKED' }
    );
    const error = popupReducer(loading, { type: 'JOB_ERROR', message: 'boom' });

    expect(error).toEqual({ status: 'error', message: 'boom' });
    expect(popupReducer(error, { type: 'RESET' })).toEqual(initialPopupState);
  });

  it('不能匯出時 EXPORT_CLICKED 是 no-op；非 idle 時 TAB_CHECKED 與 JOB_PROGRESS 也是 no-op', () => {
    const idle = { status: 'idle', canExport: false } as const;

    expect(popupReducer(idle, { type: 'EXPORT_CLICKED' })).toBe(idle);

    const success = { status: 'success', filename: 'x', stats } as const;

    expect(
      popupReducer(success, { type: 'TAB_CHECKED', isDesignProjectPage: true })
    ).toBe(success);
    expect(popupReducer(success, { type: 'JOB_PROGRESS', progress: 'p' })).toBe(
      success
    );
  });
});
