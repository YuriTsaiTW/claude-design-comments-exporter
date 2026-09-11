function normalizePath(path: string): string {
  return path.normalize('NFC').replace(/^\.\//, '').replace(/^\/+/, '');
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/**
 * 把留言的 filePath 對應到 zip 內的 entry 名稱。
 * 先 NFC 正規化後完全相符，找不到再以 basename 比對；都沒有就回 null。
 */
export function resolveFilePath(
  commentFilePath: string | null | undefined,
  zipEntryNames: readonly string[]
): string | null {
  if (!commentFilePath) {
    return null;
  }

  const target = normalizePath(commentFilePath);

  if (!target) {
    return null;
  }

  const exact = zipEntryNames.find(name => normalizePath(name) === target);

  if (exact !== undefined) {
    return exact;
  }

  const targetBase = basename(target);
  const byBase = zipEntryNames.find(
    name => basename(normalizePath(name)) === targetBase
  );

  return byBase ?? null;
}
