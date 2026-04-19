import { STARTING_AETHER } from './constants.js';
import type {
  Assets,
  Building,
  Camera,
  InteractionMode,
  Resources,
  SelectionState,
  Unit,
} from './types.js';

interface GameStateShape {
  resources: Resources;
  units: Unit[];
  buildings: Building[];
  camera: Camera;
  interactionMode: InteractionMode;
  selection: SelectionState;
  tilemap: number[][];
  lastTheme: string;
  lastTilesetImg: HTMLImageElement | null;
  assets: Assets;
}

export const state: GameStateShape = {
  resources: { aether: STARTING_AETHER },
  units: [],
  buildings: [],
  camera: { x: 0, y: 0 },
  interactionMode: 'pan',
  selection: {
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    active: false,
    units: [],
  },
  tilemap: [],
  lastTheme: '',
  lastTilesetImg: null,
  assets: {
    tiles: [],
    base: null,
    baseReady: false,
    soldierFrames: [],
  },
};

export type GameState = GameStateShape;
