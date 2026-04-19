import { MAP_HEIGHT, MAP_WIDTH } from './constants.js';
import { state } from './state.js';
import type { InteractionMode } from './types.js';

interface PointerCoords {
  x: number;
  y: number;
}

let lastTouch: PointerCoords | null = null;
let touchStartTime = 0;

function getCoords(e: MouseEvent | TouchEvent): PointerCoords {
  if ('touches' in e) {
    const t = e.touches[0] ?? e.changedTouches[0];
    if (t) return { x: t.clientX, y: t.clientY };
    return { x: 0, y: 0 };
  }
  return { x: e.clientX, y: e.clientY };
}

function handleStart(e: MouseEvent | TouchEvent): void {
  const { x, y } = getCoords(e);
  touchStartTime = Date.now();
  lastTouch = { x, y };
  if (state.interactionMode === 'select') {
    state.selection.active = true;
    state.selection.startX = x + state.camera.x;
    state.selection.startY = y + state.camera.y;
    state.selection.currentX = state.selection.startX;
    state.selection.currentY = state.selection.startY;
  }
}

function handleMove(e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement): void {
  const { x, y } = getCoords(e);
  if (state.interactionMode === 'pan' && !state.selection.active && lastTouch) {
    state.camera.x = Math.max(
      0,
      Math.min(MAP_WIDTH - canvas.width, state.camera.x + (lastTouch.x - x)),
    );
    state.camera.y = Math.max(
      0,
      Math.min(MAP_HEIGHT - canvas.height, state.camera.y + (lastTouch.y - y)),
    );
    lastTouch = { x, y };
  } else if (state.selection.active) {
    state.selection.currentX = x + state.camera.x;
    state.selection.currentY = y + state.camera.y;
  }
}

function handleEnd(onSelectionChange: () => void): void {
  const duration = Date.now() - touchStartTime;
  const { x, y } = lastTouch ?? { x: 0, y: 0 };
  const worldX = x + state.camera.x;
  const worldY = y + state.camera.y;

  const tapWithinThreshold = (): boolean => {
    const x1 = Math.min(state.selection.startX, state.selection.currentX);
    const x2 = Math.max(state.selection.startX, state.selection.currentX);
    const y1 = Math.min(state.selection.startY, state.selection.currentY);
    const y2 = Math.max(state.selection.startY, state.selection.currentY);
    return Math.abs(x1 - x2) < 10 && Math.abs(y1 - y2) < 10;
  };

  const handleTap = (): void => {
    const clickedUnit = state.units.find(
      (u) => Math.sqrt((u.x - worldX) ** 2 + (u.y - worldY) ** 2) < 30,
    );
    if (clickedUnit) {
      state.units.forEach((u) => (u.selected = false));
      clickedUnit.selected = true;
      state.selection.units = [clickedUnit];
    } else if (state.selection.units.length > 0) {
      state.selection.units.forEach((u) => {
        u.targetX = worldX + (Math.random() * 40 - 20);
        u.targetY = worldY + (Math.random() * 40 - 20);
      });
    } else {
      state.units.forEach((u) => (u.selected = false));
      state.selection.units = [];
    }
  };

  if (state.selection.active) {
    if (tapWithinThreshold()) {
      handleTap();
    } else {
      const x1 = Math.min(state.selection.startX, state.selection.currentX);
      const x2 = Math.max(state.selection.startX, state.selection.currentX);
      const y1 = Math.min(state.selection.startY, state.selection.currentY);
      const y2 = Math.max(state.selection.startY, state.selection.currentY);
      state.selection.units = state.units.filter((u) => {
        const inside = u.x >= x1 && u.x <= x2 && u.y >= y1 && u.y <= y2;
        u.selected = inside;
        return inside;
      });
    }
    state.selection.active = false;
    onSelectionChange();
  } else if (state.interactionMode === 'pan' && duration < 200) {
    handleTap();
    onSelectionChange();
  }
  lastTouch = null;
}

export function bindInput(canvas: HTMLCanvasElement, onSelectionChange: () => void): void {
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) handleStart(e);
  });
  canvas.addEventListener('mousemove', (e) => handleMove(e, canvas));
  canvas.addEventListener('mouseup', () => handleEnd(onSelectionChange));
  canvas.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      handleStart(e);
    },
    { passive: false },
  );
  canvas.addEventListener(
    'touchmove',
    (e) => {
      e.preventDefault();
      handleMove(e, canvas);
    },
    { passive: false },
  );
  canvas.addEventListener(
    'touchend',
    (e) => {
      e.preventDefault();
      handleEnd(onSelectionChange);
    },
    { passive: false },
  );
}

export function setMode(mode: InteractionMode): void {
  state.interactionMode = mode;
  document.getElementById('mode-pan')?.classList.toggle('active-mode', mode === 'pan');
  document.getElementById('mode-select')?.classList.toggle('active-mode', mode === 'select');
}
