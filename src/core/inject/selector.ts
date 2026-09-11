const ANCHOR = /^\[data-comment-anchor="([^"]+)"\]$/;

export type SelectorKind =
  | { kind: 'anchor'; anchor: string; selector: string }
  | { kind: 'css'; selector: string }
  | { kind: 'none' };

/**
 * 分類 elementSelector：
 * - anchor：Claude Design 拼接進來源檔的 data-comment-anchor 精準錨點
 * - css：一般 CSS selector（拼接失敗時的 fallback）
 * - none：沒有選擇器（純 pin 座標或未錨定）
 */
export function classifySelector(
  selector: string | null | undefined
): SelectorKind {
  const trimmed = selector?.trim() ?? '';

  if (!trimmed) {
    return { kind: 'none' };
  }

  const anchor = ANCHOR.exec(trimmed);

  if (anchor?.[1]) {
    return { kind: 'anchor', anchor: anchor[1], selector: trimmed };
  }

  return { kind: 'css', selector: trimmed };
}
