import { type Zippable, zipSync } from 'fflate';

const LOCAL_HEADER_SIG = 0x04034b50;
const UTF8_FLAG = 0x0800;

export function writeZip(files: ReadonlyMap<string, Uint8Array>): Uint8Array {
  const zippable: Zippable = {};

  for (const [name, data] of files) {
    zippable[name] = data;
  }

  return zipSync(zippable, { level: 6 });
}

/** 讀出每個 local file header 的 (檔名, 旗標)，供驗證 UTF-8 檔名旗標用。 */
export function listLocalHeaders(
  zip: Uint8Array
): { name: string; flags: number; utf8: boolean }[] {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const out: { name: string; flags: number; utf8: boolean }[] = [];
  const decoder = new TextDecoder('utf-8');
  let offset = 0;

  while (
    offset + 30 <= zip.byteLength &&
    view.getUint32(offset, true) === LOCAL_HEADER_SIG
  ) {
    const flags = view.getUint16(offset + 6, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameBytes = zip.subarray(offset + 30, offset + 30 + nameLength);

    out.push({
      name: decoder.decode(nameBytes),
      flags,
      utf8: (flags & UTF8_FLAG) !== 0,
    });
    offset += 30 + nameLength + extraLength + compressedSize;
  }

  return out;
}
