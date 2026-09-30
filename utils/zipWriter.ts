// Pure TypeScript zero-dependency ZIP archive generator (Store mode with CRC32)
// Works 100% offline in browser and Node without requiring external npm packages

// Pre-computed CRC32 lookup table
const CRC32_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipFileEntry {
  name: string;
  data: Uint8Array | string;
}

export class SimpleZip {
  private files: ZipFileEntry[] = [];

  addFile(name: string, data: Uint8Array | string): void {
    this.files.push({ name, data });
  }

  generateBlob(): Blob {
    const fileRecords: {
      nameBytes: Uint8Array;
      dataBytes: Uint8Array;
      crc: number;
      offset: number;
    }[] = [];

    const encoder = new TextEncoder();
    const parts: Uint8Array[] = [];
    let currentOffset = 0;

    // 1. Write Local File Headers + Data
    for (const file of this.files) {
      const nameBytes = encoder.encode(file.name);
      let dataBytes: Uint8Array;
      if (typeof file.data === 'string') {
        dataBytes = encoder.encode(file.data);
      } else {
        dataBytes = file.data;
      }

      const fileCrc = crc32(dataBytes);
      const headerOffset = currentOffset;

      const header = new Uint8Array(30 + nameBytes.length);
      const view = new DataView(header.buffer);

      // Local file header signature: 0x04034b50
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true); // Version needed to extract (2.0)
      view.setUint16(6, 0, true); // General purpose bit flag
      view.setUint16(8, 0, true); // Compression method (0 = store)
      view.setUint16(10, 0, true); // Last mod file time
      view.setUint16(12, 0, true); // Last mod file date
      view.setUint32(14, fileCrc, true); // CRC-32
      view.setUint32(18, dataBytes.length, true); // Compressed size
      view.setUint32(22, dataBytes.length, true); // Uncompressed size
      view.setUint16(26, nameBytes.length, true); // File name length
      view.setUint16(28, 0, true); // Extra field length

      header.set(nameBytes, 30);

      parts.push(header);
      parts.push(dataBytes);

      currentOffset += header.length + dataBytes.length;

      fileRecords.push({
        nameBytes,
        dataBytes,
        crc: fileCrc,
        offset: headerOffset,
      });
    }

    // 2. Write Central Directory Headers
    const centralDirectoryStart = currentOffset;
    let centralDirectorySize = 0;

    for (const record of fileRecords) {
      const cdHeader = new Uint8Array(46 + record.nameBytes.length);
      const view = new DataView(cdHeader.buffer);

      // Central directory file header signature: 0x02014b50
      view.setUint32(0, 0x02014b50, true);
      view.setUint16(4, 20, true); // Version made by
      view.setUint16(6, 20, true); // Version needed to extract
      view.setUint16(8, 0, true); // General purpose bit flag
      view.setUint16(10, 0, true); // Compression method (0 = store)
      view.setUint16(12, 0, true); // Last mod file time
      view.setUint16(14, 0, true); // Last mod file date
      view.setUint32(16, record.crc, true); // CRC-32
      view.setUint32(20, record.dataBytes.length, true); // Compressed size
      view.setUint32(24, record.dataBytes.length, true); // Uncompressed size
      view.setUint16(28, record.nameBytes.length, true); // File name length
      view.setUint16(30, 0, true); // Extra field length
      view.setUint16(32, 0, true); // File comment length
      view.setUint16(34, 0, true); // Disk number start
      view.setUint16(36, 0, true); // Internal file attributes
      view.setUint32(38, 0, true); // External file attributes
      view.setUint32(42, record.offset, true); // Relative offset of local header

      cdHeader.set(record.nameBytes, 46);
      parts.push(cdHeader);

      currentOffset += cdHeader.length;
      centralDirectorySize += cdHeader.length;
    }

    // 3. Write End of Central Directory Record (EOCD)
    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);

    // EOCD signature: 0x06054b50
    eocdView.setUint32(0, 0x06054b50, true);
    eocdView.setUint16(4, 0, true); // Number of this disk
    eocdView.setUint16(6, 0, true); // Disk where central directory starts
    eocdView.setUint16(8, fileRecords.length, true); // Number of central directory records on this disk
    eocdView.setUint16(10, fileRecords.length, true); // Total number of central directory records
    eocdView.setUint32(12, centralDirectorySize, true); // Size of central directory
    eocdView.setUint32(16, centralDirectoryStart, true); // Offset of start of central directory
    eocdView.setUint16(20, 0, true); // Comment length

    parts.push(eocd);

    return new Blob(parts, { type: 'application/zip' });
  }
}
