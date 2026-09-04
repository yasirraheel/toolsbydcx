const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function makePng(w, h, rgbaFunc) {
  const scanlines = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    scanlines[y * (w * 4 + 1)] = 0; // Filter type 0 (None)
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = rgbaFunc(x, y, w, h);
      const off = y * (w * 4 + 1) + 1 + x * 4;
      scanlines[off] = r;
      scanlines[off + 1] = g;
      scanlines[off + 2] = b;
      scanlines[off + 3] = a;
    }
  }

  const idat = zlib.deflateSync(scanlines);

  // CRC32 table
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type);
    const crcBuf = Buffer.concat([t, data]);
    const crcVal = crc32(crcBuf);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, t, data, crc]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// Draw FlowByDcx Icon: Dark navy circle + glowing emerald border + lightning/flow symbol
function renderFlowIcon(x, y, w, h) {
  // Normalize coords to [-1, 1]
  const nx = (x / (w - 1)) * 2 - 1;
  const ny = (y / (h - 1)) * 2 - 1;
  const r = Math.sqrt(nx * nx + ny * ny);

  // Outside circle
  if (r > 0.98) {
    return [0, 0, 0, 0];
  }

  // Smooth anti-aliased outer ring
  const borderEdge = 0.94;
  const borderInner = 0.82;
  const isBorder = r >= borderInner && r <= borderEdge;

  // Background color: Dark Navy #090d16 gradient
  let bgR = 9 + Math.floor((ny + 1) * 8);
  let bgG = 13 + Math.floor((ny + 1) * 10);
  let bgB = 22 + Math.floor((ny + 1) * 14);
  let alpha = 255;

  if (r > borderEdge) {
    const fade = (0.98 - r) / (0.98 - borderEdge);
    alpha = Math.floor(Math.max(0, Math.min(255, fade * 255)));
  }

  if (isBorder) {
    // Glowing Emerald border
    return [34, 197, 94, alpha];
  }

  // Polygon test for lightning bolt / flow symbol
  // Vertices normalized [-1, 1]:
  // Top: (0.1, -0.65)
  // Left waist: (-0.35, 0.05)
  // Inner corner: (0.02, 0.05)
  // Bottom tip: (-0.1, 0.65)
  // Right waist: (0.35, -0.05)
  // Inner corner 2: (-0.02, -0.05)
  const poly = [
    [0.1, -0.65],
    [-0.38, 0.06],
    [0.02, 0.06],
    [-0.1, 0.65],
    [0.38, -0.06],
    [-0.02, -0.06]
  ];

  function pointInPoly(px, py, vs) {
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0], yi = vs[i][1];
      const xj = vs[j][0], yj = vs[j][1];
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // Supersampling 3x3 for crisp anti-aliasing on the symbol
  let hits = 0;
  const d = 1.0 / (w * 1.5);
  for (let sx = -1; sx <= 1; sx++) {
    for (let sy = -1; sy <= 1; sy++) {
      if (pointInPoly(nx + sx * d, ny + sy * d, poly)) {
        hits++;
      }
    }
  }

  if (hits > 0) {
    const coverage = hits / 9.0;
    // Gradient on symbol: Emerald #22c55e to Cyan #38bdf8
    const symGrad = (ny + 0.65) / 1.3;
    const symR = Math.floor(34 * (1 - symGrad) + 56 * symGrad);
    const symG = Math.floor(197 * (1 - symGrad) + 189 * symGrad);
    const symB = Math.floor(94 * (1 - symGrad) + 248 * symGrad);

    const finalR = Math.floor(bgR * (1 - coverage) + symR * coverage);
    const finalG = Math.floor(bgG * (1 - coverage) + symG * coverage);
    const finalB = Math.floor(bgB * (1 - coverage) + symB * coverage);

    return [finalR, finalG, finalB, alpha];
  }

  // Ambient center glow
  const glow = Math.max(0, 1 - r * 1.4);
  bgR = Math.min(255, bgR + Math.floor(glow * 20));
  bgG = Math.min(255, bgG + Math.floor(glow * 45));
  bgB = Math.min(255, bgB + Math.floor(glow * 35));

  return [bgR, bgG, bgB, alpha];
}

const extDir = path.resolve(__dirname, '..', 'FlowByDcx-extesnion');

const sizes = [
  { size: 16, name: 'icon16.png' },
  { size: 48, name: 'icon48.png' },
  { size: 128, name: 'icon128.png' },
  { size: 256, name: 'logo.png' }
];

sizes.forEach(({ size, name }) => {
  const buf = makePng(size, size, renderFlowIcon);
  const outPath = path.join(extDir, name);
  fs.writeFileSync(outPath, buf);
  console.log(`✓ Generated ${name} (${size}x${size}, ${buf.length} bytes) at ${outPath}`);
});
