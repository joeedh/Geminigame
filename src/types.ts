export type InteractionMode = 'pan' | 'select';

export interface Unit {
  type: 'worker';
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  hp: number;
  selected: boolean;
  animFrame: number;
  isMoving: boolean;
  facing: 1 | -1;
  visualFacing: number;
}

export interface Building {
  type: 'base';
  x: number;
  y: number;
  hp: number;
}

export interface Camera {
  x: number;
  y: number;
}

export interface SelectionState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  active: boolean;
  units: Unit[];
}

export interface SpriteFrame {
  img: HTMLCanvasElement;
  w: number;
  h: number;
  offsetX: number;
  offsetY: number;
}

export interface Assets {
  tiles: HTMLCanvasElement[];
  base: HTMLImageElement | null;
  baseReady: boolean;
  soldierFrames: SpriteFrame[];
}

export interface Resources {
  aether: number;
}
