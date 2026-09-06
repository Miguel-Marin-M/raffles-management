import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

/**
 * Draws the app icon and writes it as a PNG.
 *
 * The icon is a paper square on ink with a red pen stroke across it, the same
 * mark as the favicon. It is drawn pixel by pixel here so the project does not
 * carry an image toolchain just to produce two files; re-run with
 * `node scripts/generate-icons.mjs` if the mark ever changes.
 */
const PAPER = [233, 231, 225];
const INK = [19, 26, 36];
const STAMP = [200, 54, 42];

function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const margin = Math.round(size * 0.16);
  const radius = Math.round(size * 0.12);
  const strokeWidth = size * 0.09;

  const put = (x, y, [r, g, b]) => {
    const at = (y * size + x) * 4;
    pixels[at] = r;
    pixels[at + 1] = g;
    pixels[at + 2] = b;
    pixels[at + 3] = 255;
  };

  const insideRounded = (x, y, min, max, corner) => {
    if (x < min || x > max || y < min || y > max) return false;
    const dx = Math.max(min + corner - x, 0, x - (max - corner));
    const dy = Math.max(min + corner - y, 0, y - (max - corner));
    return dx * dx + dy * dy <= corner * corner;
  };

  // Distance to the diagonal running from bottom-left to top-right.
  const distanceToStroke = (x, y) => {
    const from = { x: margin + size * 0.06, y: size - margin - size * 0.06 };
    const to = { x: size - margin - size * 0.06, y: margin + size * 0.06 };
    const vx = to.x - from.x;
    const vy = to.y - from.y;
    const t = Math.min(
      1,
      Math.max(0, ((x - from.x) * vx + (y - from.y) * vy) / (vx * vx + vy * vy)),
    );
    const px = from.x + t * vx - x;
    const py = from.y + t * vy - y;
    return Math.sqrt(px * px + py * py);
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let colour = INK;
      if (insideRounded(x, y, margin, size - margin, radius)) colour = PAPER;
      if (distanceToStroke(x, y) <= strokeWidth / 2) colour = STAMP;
      put(x, y, colour);
    }
  }

  return pixels;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function toPng(pixels, size) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // truecolour with alpha

  // Each scanline is prefixed with its filter type; 0 means "no filter".
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(pixels.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public');

for (const size of [192, 512]) {
  const png = toPng(drawIcon(size), size);
  const file = resolve(publicDir, `icon-${size}.png`);
  writeFileSync(file, png);
  console.log(`${file} (${png.length} bytes, sha1 ${createHash('sha1').update(png).digest('hex').slice(0, 8)})`);
}
