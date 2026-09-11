const PROJECT_PATH = /^\/design\/p\/([^/]+)\/?$/;

/** 從分頁網址取出 Claude Design 專案 id；不是專案頁就回 null。 */
export function parseProjectId(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' || parsed.hostname !== 'claude.ai') {
    return null;
  }

  const match = PROJECT_PATH.exec(parsed.pathname);

  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
