export const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageType = (typeof allowedImageTypes)[number];

export interface ImageInfo {
  mimeType: AllowedImageType;
  width: number;
  height: number;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
// Marqueurs JPEG « Start Of Frame » portant les dimensions.
const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

function inspectPng(buffer: Buffer): ImageInfo | null {
  if (buffer.length < 24 || buffer.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { mimeType: 'image/png', width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function inspectJpeg(buffer: Buffer): ImageInfo | null {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1] ?? 0;
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (JPEG_SOF_MARKERS.has(marker)) {
      return {
        mimeType: 'image/jpeg',
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + buffer.readUInt16BE(offset + 2);
  }
  return null;
}

function inspectWebp(buffer: Buffer): ImageInfo | null {
  if (buffer.length < 30 || buffer.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') {
    return {
      mimeType: 'image/webp',
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === 'VP8L') {
    const [b0 = 0, b1 = 0, b2 = 0, b3 = 0] = buffer.subarray(21, 25);
    return {
      mimeType: 'image/webp',
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    };
  }
  if (chunk === 'VP8X') {
    return {
      mimeType: 'image/webp',
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  return null;
}

/**
 * Détermine le type réel d'une image à partir de sa signature binaire (jamais de l'extension
 * ni de l'en-tête Content-Type) et lit ses dimensions. SVG et autres formats sont refusés.
 */
export function inspectImage(buffer: Buffer): ImageInfo | null {
  try {
    if (startsWith(buffer, PNG_SIGNATURE)) return inspectPng(buffer);
    if (startsWith(buffer, [0xff, 0xd8, 0xff])) return inspectJpeg(buffer);
    if (buffer.toString('ascii', 0, 4) === 'RIFF') return inspectWebp(buffer);
  } catch {
    return null;
  }
  return null;
}
