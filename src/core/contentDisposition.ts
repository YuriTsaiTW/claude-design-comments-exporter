const EXT_VALUE = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i;
const QUOTED = /filename\s*=\s*"((?:[^"\\]|\\.)*)"/i;
const TOKEN = /filename\s*=\s*([^;\s]+)/i;

/**
 * 解析 Content-Disposition 的檔名。
 * 優先 RFC 5987 的 filename*（可含 UTF-8 percent-encoding），其次 filename="…"，最後裸值。
 */
export function parseContentDispositionFilename(
  header: string | null | undefined
): string | null {
  if (!header) {
    return null;
  }

  const ext = EXT_VALUE.exec(header);

  if (ext?.[2]) {
    try {
      return decodeURIComponent(ext[2].trim());
    } catch {
      return ext[2].trim();
    }
  }

  const quoted = QUOTED.exec(header);

  if (quoted?.[1] !== undefined) {
    return quoted[1].replace(/\\(.)/g, '$1');
  }

  const token = TOKEN.exec(header);

  return token?.[1] ?? null;
}
