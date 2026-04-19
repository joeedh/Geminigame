import { MAP_SIZE, SPRITE_FRAMES, STRIDE_LENGTH, TILE_SIZE, UNIT_MOVE_SPEED } from './constants.js';
import { state } from './state.js';

export function update(): void {
  state.units.forEach((u) => {
    const dx = u.targetX - u.x;
    const dy = u.targetY - u.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 2) {
      u.isMoving = true;
      const moveX = (dx / dist) * UNIT_MOVE_SPEED;
      const moveY = (dy / dist) * UNIT_MOVE_SPEED;
      u.x += moveX;
      u.y += moveY;
      u.animFrame =
        (u.animFrame + Math.sqrt(moveX * moveX + moveY * moveY) / STRIDE_LENGTH) % SPRITE_FRAMES;

      const targetFacing = dx >= 0 ? 1 : -1;
      if (Math.abs(dx) > 0.8) u.facing = targetFacing;
    } else {
      u.isMoving = false;
      u.x = u.targetX;
      u.y = u.targetY;
      u.animFrame = 0;
    }

    u.visualFacing += (u.facing - u.visualFacing) * 0.2;
  });
}

export function draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-state.camera.x, -state.camera.y);

  const startX = Math.max(0, Math.floor(state.camera.x / TILE_SIZE));
  const endX = Math.min(MAP_SIZE, Math.ceil((state.camera.x + canvas.width) / TILE_SIZE));
  const startY = Math.max(0, Math.floor(state.camera.y / TILE_SIZE));
  const endY = Math.min(MAP_SIZE, Math.ceil((state.camera.y + canvas.height) / TILE_SIZE));

  for (let y = startY; y < endY; y++) {
    const row = state.tilemap[y];
    if (!row) continue;
    for (let x = startX; x < endX; x++) {
      const tileIdx = row[x] ?? 0;
      const tile = state.assets.tiles[tileIdx];
      if (tile) {
        ctx.drawImage(tile, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.strokeStyle = '#1a1a1e';
        ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  state.buildings.forEach((b) => {
    if (state.assets.baseReady && state.assets.base) {
      ctx.drawImage(state.assets.base, b.x - 96, b.y - 120, 192, 192);
    } else {
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(b.x - 40, b.y - 40, 80, 80, 8);
      ctx.fill();
    }
  });

  state.units.forEach((u) => {
    ctx.save();
    ctx.translate(u.x, u.y);

    if (u.selected) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 5, 20, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (state.assets.soldierFrames.length === SPRITE_FRAMES) {
      const frameIdx = Math.floor(u.animFrame) % SPRITE_FRAMES;
      const frame = state.assets.soldierFrames[frameIdx];
      const baseFrame = state.assets.soldierFrames[0];
      if (frame && baseFrame) {
        const renderFacing = u.visualFacing > 0 ? 1 : -1;
        ctx.scale(renderFacing, 1);

        const baseH = 80;
        const scale = baseH / (baseFrame.h || baseH);
        const dw = frame.w * scale;
        const dh = frame.h * scale;

        ctx.drawImage(frame.img, -dw / 2, -dh + 5, dw, dh);
      }
    } else {
      ctx.fillStyle = u.selected ? '#22c55e' : '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  if (state.selection.active) {
    ctx.strokeStyle = '#22c55e';
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(
      state.selection.startX,
      state.selection.startY,
      state.selection.currentX - state.selection.startX,
      state.selection.currentY - state.selection.startY,
    );
    ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
    ctx.fillRect(
      state.selection.startX,
      state.selection.startY,
      state.selection.currentX - state.selection.startX,
      state.selection.currentY - state.selection.startY,
    );
    ctx.setLineDash([]);
  }
  ctx.restore();
}
