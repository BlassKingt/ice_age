import { describe, expect, it } from "vitest";
import {
  buyWorker,
  canHarvest,
  clearObstacle,
  createInitialState,
  damageShelter,
  depositAtShop,
  fundBuildPoint,
  harvestNode,
  levelUpBuildPoint,
  serveOneCustomer,
  shouldGuideToMeatExpansion,
  splitDropsIntoUnits,
  tickShops,
  tickWorker
} from "./gameLogic";

describe("ice age demo game logic", () => {
  it("harvests normal trees into the player's wood stack", () => {
    const state = createInitialState();

    harvestNode(state, "tree-1");

    expect(state.player.wood).toBe(5);
    expect(state.nodes["tree-1"].amount).toBe(0);
  });

  it("clears a marked tree cluster with axe progress and reveals the meat shop build point", () => {
    const state = createInitialState();

    clearObstacle(state, "cluster-shelter", 3);
    expect(state.expansions.shelter).toBe(false);
    expect(state.obstacles["cluster-shelter"].progress).toBe(3);

    const drops = clearObstacle(state, "cluster-shelter", 3);

    expect(state.expansions.shelter).toBe(true);
    expect(state.shops.meat.unlocked).toBe(false);
    expect(state.obstacles["cluster-shelter"].cleared).toBe(true);
    expect(drops).toEqual({ wood: 12, meat: 0, ore: 0, coin: 0 });
  });

  it("unlocks the mine area and ore shop after clearing the mine tree cluster", () => {
    const state = createInitialState();

    clearObstacle(state, "cluster-mine", 8);

    expect(state.expansions.mine).toBe(true);
    expect(state.shops.ore.unlocked).toBe(true);
    expect(canHarvest(state, "ore-1")).toBe(true);
  });

  it("熊只掉肉，不掉金币", () => {
    const drops = { wood: 0, meat: 3, ore: 0, coin: 0 };

    expect(drops.coin).toBe(0);
    expect(drops.meat).toBeGreaterThan(0);
  });

  it("玩家持有肉且肉铺未解锁时，需要显示肉铺扩建引导", () => {
    const state = createInitialState();
    state.player.meat = 1;
    state.shops.meat.unlocked = false;

    expect(shouldGuideToMeatExpansion(state)).toBe(true);

    state.shops.meat.unlocked = true;
    expect(shouldGuideToMeatExpansion(state)).toBe(false);
  });

  it("资源掉落会拆成 1 个单位的拾取物", () => {
    const drops = splitDropsIntoUnits({ wood: 2, meat: 1, ore: 0, coin: 0 });

    expect(drops).toEqual([
      { resource: "wood", amount: 1 },
      { resource: "wood", amount: 1 },
      { resource: "meat", amount: 1 }
    ]);
  });

  it("stores resources at unlocked matching shops before they become coins", () => {
    const state = createInitialState();
    state.player.wood = 10;
    state.player.ore = 4;

    expect(depositAtShop(state, "wood")).toBe(10);
    expect(state.player.wood).toBe(0);
    expect(state.shops.wood.stock).toBe(10);
    expect(state.player.coin).toBe(0);

    expect(depositAtShop(state, "ore")).toBe(0);
    clearObstacle(state, "cluster-mine", 8);
    expect(depositAtShop(state, "ore")).toBe(4);
    expect(state.shops.ore.stock).toBe(4);
  });

  it("turns shop stock into coin piles over time", () => {
    const state = createInitialState();
    state.player.wood = 3;
    depositAtShop(state, "wood");

    tickShops(state, 1);

    expect(state.shops.wood.stock).toBe(1);
    expect(state.shops.wood.coinPile).toBe(2);
    expect(state.player.coin).toBe(0);
  });

  it("customers buy exactly one shop stock item and leave matching coins", () => {
    const state = createInitialState();
    state.shops.wood.stock = 2;

    expect(serveOneCustomer(state, "wood")).toBe(true);
    expect(state.shops.wood.stock).toBe(1);
    expect(state.shops.wood.coinPile).toBe(1);
  });

  it("funds build points one coin at a time and preserves partial progress", () => {
    const state = createInitialState();
    state.player.coin = 2;

    expect(fundBuildPoint(state, "axe", 10, 5)).toEqual({ spent: 2, completed: false, progress: 2 });
    expect(state.player.coin).toBe(0);
    expect(state.buildPoints.axe.progress).toBe(2);

    state.player.coin = 3;
    expect(fundBuildPoint(state, "axe", 10, 1)).toEqual({ spent: 1, completed: false, progress: 3 });
    expect(state.player.coin).toBe(2);
  });

  it("lets build points upgrade for several levels before becoming capped", () => {
    const state = createInitialState();
    state.player.coin = 20;

    expect(fundBuildPoint(state, "axe", 3, 3).completed).toBe(true);
    expect(levelUpBuildPoint(state, "axe", 2)).toEqual({ level: 1, capped: false });
    expect(state.buildPoints.axe.progress).toBe(0);

    expect(fundBuildPoint(state, "axe", 3, 3).completed).toBe(true);
    expect(levelUpBuildPoint(state, "axe", 2)).toEqual({ level: 2, capped: true });
  });

  it("hires a shop worker who carries matching resources into shop stock", () => {
    const state = createInitialState();
    state.player.coin = 20;

    expect(buyWorker(state, "wood")).toBe(true);
    tickWorker(state, 4);

    expect(state.shops.wood.stock).toBe(2);
    expect(state.shops.wood.coinPile).toBe(0);
    expect(state.workers[0]).toMatchObject({ shop: "wood", cycles: 0 });
  });

  it("workers wait until a full carry cycle before delivering resources", () => {
    const state = createInitialState();
    state.player.coin = 20;

    expect(buyWorker(state, "wood")).toBe(true);
    tickWorker(state, 3.4);
    expect(state.shops.wood.stock).toBe(0);

    tickWorker(state, 0.6);
    expect(state.shops.wood.stock).toBe(2);
    expect(state.workers[0].cycles).toBe(0);
  });

  it("ore workers carry enough ore to make the stock pile visible", () => {
    const state = createInitialState();
    state.player.coin = 20;
    state.shops.ore.unlocked = true;

    expect(buyWorker(state, "ore")).toBe(true);
    tickWorker(state, 4);

    expect(state.shops.ore.stock).toBe(3);
  });

  it("每个已解锁铺子最多雇佣一个工人，不能重复雇佣", () => {
    const state = createInitialState();
    state.player.coin = 100;
    state.shops.meat.unlocked = true;

    expect(buyWorker(state, "wood")).toBe(true);
    expect(buyWorker(state, "wood")).toBe(false);
    expect(buyWorker(state, "meat")).toBe(true);
    expect(state.workers.map((worker) => worker.shop)).toEqual(["wood", "meat"]);
  });

  it("damages the shelter but never drops health below zero", () => {
    const state = createInitialState();

    damageShelter(state, 40);
    damageShelter(state, 90);

    expect(state.shelterHp).toBe(0);
  });
});
