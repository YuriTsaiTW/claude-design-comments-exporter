import { unzipSync } from 'fflate';

export interface ZipEntries {
  /** 檔名 → 內容（不含目錄項目） */
  files: Map<string, Uint8Array>;
  /** 保留原始順序，重新打包時沿用 */
  order: string[];
}

const HTML_SUFFIX = /\.html$/i;

/** 只把 .html／.dc.html 當文字檔；其餘（含無副檔名的 .thumbnail）都是二進位。 */
export function isHtmlEntry(name: string): boolean {
  return HTML_SUFFIX.test(name);
}

export function readZip(bytes: Uint8Array): ZipEntries {
  const raw = unzipSync(bytes);
  const files = new Map<string, Uint8Array>();
  const order: string[] = [];

  for (const [name, data] of Object.entries(raw)) {
    if (name.endsWith('/')) {
      continue;
    }

    files.set(name, data);
    order.push(name);
  }

  return { files, order };
}
