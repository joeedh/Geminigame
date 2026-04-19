import { SPRITE_FRAMES, TILE_SIZE, TILE_VARIANTS } from './constants.js';
import type { SpriteFrame } from './types.js';

function get2DContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to acquire 2D context.');
  return ctx;
}

export function removeBackground(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const tCtx = get2DContext(c);
  tCtx.drawImage(img, 0, 0);
  const imageData = tCtx.getImageData(0, 0, c.width, c.height);
  const data = imageData.data;

  const cornerIndices = [
    0,
    (c.width - 1) * 4,
    (c.height - 1) * c.width * 4,
    data.length - 4,
  ] as const;

  let kr = 0;
  let kg = 0;
  let kb = 0;
  for (const idx of cornerIndices) {
    kr += data[idx] ?? 0;
    kg += data[idx + 1] ?? 0;
    kb += data[idx + 2] ?? 0;
  }
  kr /= 4;
  kg /= 4;
  kb /= 4;

  const threshold = 75;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const diff = Math.abs(r - kr) + Math.abs(g - kg) + Math.abs(b - kb);
    if (diff < threshold) {
      data[i + 3] = 0;
    }
  }
  tCtx.putImageData(imageData, 0, 0);
  return c;
}

export function sliceTileset(img: HTMLImageElement): HTMLCanvasElement[] {
  const cells = Math.sqrt(TILE_VARIANTS);
  const size = img.width / cells;
  const tiles: HTMLCanvasElement[] = [];
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const tileCanvas = document.createElement('canvas');
      tileCanvas.width = TILE_SIZE;
      tileCanvas.height = TILE_SIZE;
      const tCtx = get2DContext(tileCanvas);
      tCtx.drawImage(img, x * size, y * size, size, size, 0, 0, TILE_SIZE, TILE_SIZE);
      tiles.push(tileCanvas);
    }
  }
  return tiles;
}

export function processUnitSheet(img: HTMLImageElement): SpriteFrame[] {
  const keyedCanvas = removeBackground(img);
  const fw = keyedCanvas.width / SPRITE_FRAMES;
  const fh = keyedCanvas.height;
  const tempCtx = get2DContext(keyedCanvas);

  const frames: SpriteFrame[] = [];

  for (let i = 0; i < SPRITE_FRAMES; i++) {
    const frameData = tempCtx.getImageData(i * fw, 0, fw, fh);
    const data = frameData.data;
    let minX = fw;
    let maxX = 0;
    let minY = fh;
    let maxY = 0;

    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const alpha = data[(y * fw + x) * 4 + 3] ?? 0;
        if (alpha > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX) {
      minX = 0;
      maxX = fw;
      minY = 0;
      maxY = fh;
    }

    const contentW = maxX - minX + 1;
    const contentH = maxY - minY + 1;

    const fCanvas = document.createElement('canvas');
    fCanvas.width = contentW;
    fCanvas.height = contentH;
    const fCtx = get2DContext(fCanvas);
    fCtx.putImageData(tempCtx.getImageData(i * fw + minX, minY, contentW, contentH), 0, 0);

    frames.push({
      img: fCanvas,
      w: contentW,
      h: contentH,
      offsetX: minX - fw / 2,
      offsetY: minY - fh,
    });
  }

  return frames;
}
