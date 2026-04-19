import { fetchAIImage, refineImageWithAI } from './api.js';
import { MAP_SIZE } from './constants.js';
import { bindInput, setMode } from './input.js';
import { draw, update } from './render.js';
import { processUnitSheet, removeBackground, sliceTileset } from './sprites.js';
import { state } from './state.js';
import { showError, showOverlay, updateResourceUI, updateUI } from './ui.js';

const API_KEY = '';

function getRequiredElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Required element #${id} not found.`);
  return el as T;
}

function generateMapData(): void {
  const tilemap: number[][] = [];
  for (let y = 0; y < MAP_SIZE; y++) {
    const row: number[] = [];
    for (let x = 0; x < MAP_SIZE; x++) {
      const noise = Math.random();
      let type = 0;
      if (noise > 0.85) type = 1;
      if (noise > 0.95) type = 2;
      if (noise > 0.98) type = 3;
      row.push(type);
    }
    tilemap.push(row);
  }
  state.tilemap = tilemap;
}

function init(): void {
  const canvas = getRequiredElement<HTMLCanvasElement>('gameCanvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to acquire 2D context for game canvas.');

  const resize = (): void => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  generateMapData();

  state.buildings = [{ type: 'base', x: 800, y: 800, hp: 1000 }];
  state.units = [];
  for (let i = 0; i < 3; i++) {
    state.units.push({
      type: 'worker',
      x: 900 + i * 40,
      y: 800 + i * 20,
      targetX: 900 + i * 40,
      targetY: 800 + i * 20,
      hp: 50,
      selected: false,
      animFrame: 0,
      isMoving: false,
      facing: 1,
      visualFacing: 1,
    });
  }

  state.camera.x = 800 - canvas.width / 2;
  state.camera.y = 800 - canvas.height / 2;

  bindInput(canvas, updateUI);

  getRequiredElement('mode-pan').onclick = (): void => setMode('pan');
  getRequiredElement('mode-select').onclick = (): void => setMode('select');
  getRequiredElement('btn-deselect').onclick = (): void => {
    state.units.forEach((u) => (u.selected = false));
    state.selection.units = [];
    updateUI();
  };

  const themeInput = getRequiredElement<HTMLInputElement>('theme-prompt');
  const refineBtn = getRequiredElement('refine-art-btn');

  getRequiredElement('gen-art-btn').onclick = async (): Promise<void> => {
    const theme = themeInput.value || 'Cybernetic Desert';
    state.lastTheme = theme;
    showOverlay(true);
    try {
      const [tilesImg, unitSheet, baseImg] = await Promise.all([
        fetchAIImage(`Top-down 2x2 grid tileset of ${theme} ground textures`, API_KEY),
        fetchAIImage(
          `1x4 horizontal walk animation of one ${theme} soldier robot, white background, sprite sheet`,
          API_KEY,
        ),
        fetchAIImage(
          `Top-down isometric ${theme} command bunker building, white background`,
          API_KEY,
        ),
      ]);
      state.lastTilesetImg = tilesImg;

      state.assets.tiles = sliceTileset(tilesImg);
      state.assets.soldierFrames = processUnitSheet(unitSheet);

      const bKeyed = removeBackground(baseImg);
      const bImg = new Image();
      bImg.onload = (): void => {
        state.assets.base = bImg;
        state.assets.baseReady = true;
      };
      bImg.src = bKeyed.toDataURL();

      generateMapData();
      refineBtn.classList.remove('hidden');
    } catch (e) {
      showError(e instanceof Error ? e.message : String(e));
    } finally {
      showOverlay(false);
    }
  };

  refineBtn.onclick = async (): Promise<void> => {
    if (!state.lastTilesetImg) return;
    showOverlay(true);
    try {
      const refinedTiles = await refineImageWithAI(state.lastTilesetImg, state.lastTheme, API_KEY);
      state.lastTilesetImg = refinedTiles;
      state.assets.tiles = sliceTileset(refinedTiles);
    } catch (e) {
      showError(e instanceof Error ? e.message : String(e));
    } finally {
      showOverlay(false);
    }
  };

  window.oncontextmenu = (e): boolean => {
    e.preventDefault();
    return false;
  };

  updateResourceUI();

  const loop = (): void => {
    update();
    draw(canvas, ctx);
    updateResourceUI();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
