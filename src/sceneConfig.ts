import type { ShopKind } from "./gameLogic";

export type ScenePoint = { x: number; y: number };

export type ShopLayout = {
  shop: ScenePoint;
  unloadPoint: ScenePoint;
  stockPile: ScenePoint;
  coinPile: ScenePoint;
  workerPoint: ScenePoint;
  queueStart: ScenePoint;
};

export const shopLayouts: Record<ShopKind, ShopLayout> = {
  wood: {
    shop: { x: 170, y: 720 },
    unloadPoint: { x: 170, y: 845 },
    stockPile: { x: 132, y: 785 },
    coinPile: { x: 208, y: 785 },
    workerPoint: { x: 120, y: 945 },
    queueStart: { x: 170, y: 610 }
  },
  meat: {
    shop: { x: 650, y: 820 },
    unloadPoint: { x: 575, y: 820 },
    stockPile: { x: 650, y: 750 },
    coinPile: { x: 650, y: 890 },
    workerPoint: { x: 575, y: 920 },
    queueStart: { x: 650, y: 980 }
  },
  ore: {
    shop: { x: 550, y: 720 },
    unloadPoint: { x: 550, y: 845 },
    stockPile: { x: 512, y: 785 },
    coinPile: { x: 588, y: 785 },
    workerPoint: { x: 600, y: 945 },
    queueStart: { x: 550, y: 610 }
  }
};

export const turretBase: ScenePoint = { x: 116, y: 520 };

export const shelterExpansion = {
  meatDebris: { x: 650, y: 820 },
  meatArrowOffset: { x: -30, y: -95 },
  expandedFloor: { x: 360, y: 800, width: 680, height: 430 },
  topDoor: { x: 360, y: 585, width: 128, height: 74 },
  rightDoor: { x: 700, y: 820, width: 68, height: 128 },
  door: { x: 360, y: 1040, width: 120, height: 68 },
  walls: [
    { x: 145, y: 585, width: 250, height: 26 },
    { x: 575, y: 585, width: 250, height: 26 },
    { x: 20, y: 800, width: 26, height: 430 },
    { x: 700, y: 680, width: 26, height: 190 },
    { x: 700, y: 960, width: 26, height: 190 },
    { x: 210, y: 1015, width: 300, height: 26 },
    { x: 510, y: 1015, width: 300, height: 26 }
  ]
};
