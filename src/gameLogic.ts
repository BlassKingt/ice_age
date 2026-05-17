export type Resource = "wood" | "meat" | "ore" | "coin";
export type ShopKind = "wood" | "meat" | "ore";

export type ResourceBundle = Record<Resource, number>;
export type UnitDrop = { resource: Resource; amount: 1 };

export type GameState = {
  player: ResourceBundle;
  shelterHp: number;
  expansions: {
    shelter: boolean;
    mine: boolean;
  };
  shops: Record<ShopKind, { unlocked: boolean; rate: number; stock: number; coinPile: number; processRemainder: number }>;
  nodes: Record<string, { type: Exclude<Resource, "coin">; amount: number; unlockedBy?: keyof GameState["expansions"] }>;
  obstacles: Record<
    string,
    {
      progress: number;
      required: number;
      cleared: boolean;
      unlocks?: keyof GameState["expansions"];
      drops: ResourceBundle;
    }
  >;
  workers: Array<{ shop: ShopKind; cycles: number }>;
  buildPoints: Record<string, { progress: number; level: number; capped: boolean }>;
};

const emptyBundle = (): ResourceBundle => ({ wood: 0, meat: 0, ore: 0, coin: 0 });

export function splitDropsIntoUnits(bundle: ResourceBundle): UnitDrop[] {
  const result: UnitDrop[] = [];
  for (const resource of ["wood", "meat", "ore", "coin"] as Resource[]) {
    for (let i = 0; i < bundle[resource]; i += 1) {
      result.push({ resource, amount: 1 });
    }
  }
  return result;
}

export function shouldGuideToMeatExpansion(state: GameState): boolean {
  return state.player.meat > 0 && !state.shops.meat.unlocked;
}

export function createInitialState(): GameState {
  return {
    player: emptyBundle(),
    shelterHp: 100,
    expansions: {
      shelter: false,
      mine: false
    },
    shops: {
      wood: { unlocked: true, rate: 1, stock: 0, coinPile: 0, processRemainder: 0 },
      meat: { unlocked: false, rate: 3, stock: 0, coinPile: 0, processRemainder: 0 },
      ore: { unlocked: false, rate: 4, stock: 0, coinPile: 0, processRemainder: 0 }
    },
    nodes: {
      "tree-1": { type: "wood", amount: 5 },
      "tree-2": { type: "wood", amount: 5 },
      "ore-1": { type: "ore", amount: 4, unlockedBy: "mine" }
    },
    obstacles: {
      "cluster-shelter": {
        progress: 0,
        required: 6,
        cleared: false,
        unlocks: "shelter",
        drops: { wood: 12, meat: 0, ore: 0, coin: 0 }
      },
      "cluster-mine": {
        progress: 0,
        required: 8,
        cleared: false,
        unlocks: "mine",
        drops: { wood: 8, meat: 0, ore: 3, coin: 2 }
      }
    },
    workers: [],
    buildPoints: {}
  };
}

export function canHarvest(state: GameState, nodeId: string): boolean {
  const node = state.nodes[nodeId];
  if (!node || node.amount <= 0) {
    return false;
  }
  return node.unlockedBy ? state.expansions[node.unlockedBy] : true;
}

export function harvestNode(state: GameState, nodeId: string): number {
  if (!canHarvest(state, nodeId)) {
    return 0;
  }

  const node = state.nodes[nodeId];
  const amount = node.amount;
  state.player[node.type] += amount;
  node.amount = 0;
  return amount;
}

export function clearObstacle(state: GameState, obstacleId: string, axeWork: number): ResourceBundle {
  const obstacle = state.obstacles[obstacleId];
  if (!obstacle || obstacle.cleared) {
    return emptyBundle();
  }

  obstacle.progress = Math.min(obstacle.required, obstacle.progress + axeWork);
  if (obstacle.progress < obstacle.required) {
    return emptyBundle();
  }

  obstacle.cleared = true;
  if (obstacle.unlocks) {
    state.expansions[obstacle.unlocks] = true;
  }
  if (obstacle.unlocks === "mine") {
    state.shops.ore.unlocked = true;
  }

  return { ...obstacle.drops };
}

export function depositAtShop(state: GameState, kind: ShopKind): number {
  const shop = state.shops[kind];
  if (!shop.unlocked) {
    return 0;
  }

  const amount = state.player[kind];
  if (amount <= 0) {
    return 0;
  }

  state.player[kind] = 0;
  shop.stock += amount;
  return amount;
}

export function collectShopCoins(state: GameState, kind: ShopKind): number {
  const shop = state.shops[kind];
  if (!shop.unlocked || shop.coinPile <= 0) {
    return 0;
  }

  const coins = shop.coinPile;
  shop.coinPile = 0;
  state.player.coin += coins;
  return coins;
}

export function tickShops(state: GameState, seconds: number): void {
  for (const kind of Object.keys(state.shops) as ShopKind[]) {
    processShop(state, kind, seconds * 2);
  }
}

export function serveOneCustomer(state: GameState, shop: ShopKind): boolean {
  const target = state.shops[shop];
  if (!target.unlocked || target.stock <= 0) {
    return false;
  }

  target.stock -= 1;
  target.coinPile += target.rate;
  return true;
}

function processShop(state: GameState, kind: ShopKind, rawAmount: number): void {
  const shop = state.shops[kind];
  if (!shop.unlocked || shop.stock <= 0) {
    return;
  }

  shop.processRemainder += rawAmount;
  const amount = Math.min(shop.stock, Math.floor(shop.processRemainder));
  if (amount <= 0) {
    return;
  }

  shop.processRemainder -= amount;
  shop.stock -= amount;
  shop.coinPile += amount * shop.rate;
}

export function fundBuildPoint(
  state: GameState,
  id: string,
  required: number,
  maxCoins: number
): { spent: number; completed: boolean; progress: number } {
  if (!state.buildPoints[id]) {
    state.buildPoints[id] = { progress: 0, level: 0, capped: false };
  }

  const point = state.buildPoints[id];
  if (point.capped) {
    return { spent: 0, completed: true, progress: point.progress };
  }
  const missing = Math.max(0, required - point.progress);
  const spent = Math.min(state.player.coin, maxCoins, missing);
  point.progress += spent;
  state.player.coin -= spent;

  return {
    spent,
    completed: point.progress >= required,
    progress: point.progress
  };
}

export function levelUpBuildPoint(state: GameState, id: string, maxLevel: number): { level: number; capped: boolean } {
  if (!state.buildPoints[id]) {
    state.buildPoints[id] = { progress: 0, level: 0, capped: false };
  }

  const point = state.buildPoints[id];
  point.level += 1;
  point.progress = 0;
  point.capped = point.level >= maxLevel;
  return { level: point.level, capped: point.capped };
}

export function buyWorker(state: GameState, shop: ShopKind = "wood"): boolean {
  const cost = 15;
  if (state.player.coin < cost || !state.shops[shop].unlocked) {
    return false;
  }
  if (state.workers.some((worker) => worker.shop === shop)) {
    return false;
  }

  state.player.coin -= cost;
  state.workers.push({ shop, cycles: 0 });
  return true;
}

export function tickWorker(state: GameState, seconds: number): void {
  for (const worker of state.workers) {
    processShop(state, worker.shop, seconds * 4);
    worker.cycles += 1;
  }
}

export function damageShelter(state: GameState, damage: number): void {
  state.shelterHp = Math.max(0, state.shelterHp - damage);
}
