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
    workerPoint: { x: 82, y: 910 },
    queueStart: { x: 170, y: 610 }
  },
  meat: {
    shop: { x: 645, y: 900 },
    unloadPoint: { x: 570, y: 920 },
    stockPile: { x: 645, y: 830 },
    coinPile: { x: 645, y: 970 },
    workerPoint: { x: 540, y: 1000 },
    queueStart: { x: 650, y: 980 }
  },
  ore: {
    shop: { x: 540, y: 695 },
    unloadPoint: { x: 500, y: 815 },
    stockPile: { x: 502, y: 760 },
    coinPile: { x: 578, y: 760 },
    workerPoint: { x: 625, y: 780 },
    queueStart: { x: 550, y: 610 }
  }
};

export const workerResourcePoints: Record<ShopKind, ScenePoint> = {
  wood: { x: 145, y: 230 },
  meat: { x: 610, y: 500 },
  ore: { x: 555, y: 290 }
};

export const workerRoutes: Record<ShopKind, ScenePoint[]> = {
  wood: [workerResourcePoints.wood, { x: 360, y: 585 }, shopLayouts.wood.unloadPoint],
  meat: [workerResourcePoints.meat, { x: 360, y: 585 }, shopLayouts.meat.unloadPoint],
  ore: [workerResourcePoints.ore, { x: 360, y: 585 }, shopLayouts.ore.unloadPoint]
};

export const turretBases: Record<"left" | "right", ScenePoint> = {
  left: { x: 116, y: 520 },
  right: { x: 605, y: 500 }
};

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
