import Phaser from "phaser";
import "./style.css";
import {
  clearObstacle,
  collectShopCoins,
  createInitialState,
  damageShelter,
  depositAtShop,
  fundBuildPoint,
  harvestNode,
  levelUpBuildPoint,
  serveOneCustomer,
  shouldGuideToMeatExpansion,
  splitDropsIntoUnits,
  tickWorker,
  type GameState,
  type Resource,
  type ResourceBundle,
  type ShopKind
} from "./gameLogic";
import { buildStackBlocks } from "./visualStack";
import { createFallbackTextures, TextureKey } from "./visualAssets";
import { shelterExpansion, shopLayouts, turretBases } from "./sceneConfig";

const WORLD_WIDTH = 720;
const WORLD_HEIGHT = 1320;
const VIEW_WIDTH = 540;
const VIEW_HEIGHT = 960;
const SHELTER_CENTER_X = 360;
const SHELTER_ATTACK_POINT = { x: SHELTER_CENTER_X, y: 610 };

type Point = { x: number; y: number };

const PROMO_WAYPOINTS: Point[] = [
  { x: 500, y: 230 },
  { x: 420, y: 410 },
  { x: SHELTER_ATTACK_POINT.x, y: SHELTER_ATTACK_POINT.y },
  { x: 170, y: 845 },
  { x: 610, y: 300 },
  { x: 360, y: 610 }
];

type TreeView = {
  id: string;
  x: number;
  y: number;
  active: boolean;
  nextRespawn: number;
  shape: Phaser.GameObjects.Container;
};

type ObstacleView = {
  id: string;
  x: number;
  y: number;
  label: string;
  shape: Phaser.GameObjects.Container;
  bar: Phaser.GameObjects.Rectangle;
};

type ShopView = {
  kind: ShopKind;
  x: number;
  y: number;
  title: string;
  group: Phaser.GameObjects.Container;
  lockedVeil: Phaser.GameObjects.Rectangle;
  stockText: Phaser.GameObjects.Text;
  coinText: Phaser.GameObjects.Text;
  stockPile: Phaser.GameObjects.Container;
  coinPile: Phaser.GameObjects.Container;
  customers: Phaser.GameObjects.Container[];
  markers: Array<Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible>;
};

type BuildPointView = {
  id: string;
  x: number;
  y: number;
  required: number;
  label: string;
  done: boolean;
  text: Phaser.GameObjects.Text;
  pad: Phaser.GameObjects.Rectangle;
  maxLevel: number;
  onComplete: () => void;
};

type PickupView = {
  resource: Resource;
  amount: number;
  icon: Phaser.GameObjects.Container;
};

type BearView = {
  hp: number;
  maxHp: number;
  speed: number;
  body: Phaser.GameObjects.Container;
  hpBar: Phaser.GameObjects.Rectangle;
};

class IceAgeScene extends Phaser.Scene {
  private state!: GameState;
  private player!: Phaser.GameObjects.Container;
  private playerBody!: Phaser.GameObjects.Arc;
  private stackLayer!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private shelterHpBar!: Phaser.GameObjects.Rectangle;
  private meatGuideArrow?: Phaser.GameObjects.Container;
  private expansionFloor?: Phaser.GameObjects.Rectangle;
  private shelterWallViews: Phaser.GameObjects.Rectangle[] = [];
  private target: Point = { x: 270, y: 650 };
  private trees: TreeView[] = [];
  private obstacles: ObstacleView[] = [];
  private shops: ShopView[] = [];
  private buildPoints: BuildPointView[] = [];
  private pickups: PickupView[] = [];
  private bears: BearView[] = [];
  private workerSprites: Partial<Record<ShopKind, Phaser.GameObjects.Container>> = {};
  private turrets: Phaser.GameObjects.Container[] = [];
  private promoMode = false;
  private promoStartedAt = 0;
  private promoWaypointIndex = 0;
  private promoCaptionShown = false;
  private axeAngle = 0;
  private axeLevel = 1;
  private lastHarvest = 0;
  private lastMine = 0;
  private lastShop = 0;
  private lastCoinCollect = 0;
  private lastCustomerServe: Partial<Record<ShopKind, number>> = {};
  private lastFund = 0;
  private lastClear = 0;
  private lastBearSpawn = 0;
  private lastBearAttack = 0;
  private lastAxeHit = 0;

  create(): void {
    this.state = createInitialState();
    this.promoMode = new URLSearchParams(window.location.search).get("mode") === "promo";
    createFallbackTextures(this);
    this.drawWorld();
    this.createPlayer();
    this.configurePromoMode();
    this.configureCamera();
    this.createUi();
    this.createMeatGuideArrow();

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.setTargetFromPointer(pointer));
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        this.setTargetFromPointer(pointer);
      }
    });
  }

  update(time: number, deltaMs: number): void {
    const delta = deltaMs / 1000;
    this.updatePromoMode(time);
    this.movePlayer(delta);
    this.updateAxes(time);
    this.handleHarvest(time);
    this.handleObstacleClearing(time);
    this.handleShops(time);
    this.handleUpgrades();
    this.handlePickups();
    this.updateWorker(delta);
    this.updateCustomers(time);
    this.updateBears(time, delta);
    this.updateVisibility();
    this.updateUi();
    this.updateMeatGuideArrow();
    this.updateDepths();
  }

  private drawWorld(): void {
    this.add.rectangle(SHELTER_CENTER_X, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0xdcecf4);
    this.add.rectangle(SHELTER_CENTER_X, 1080, WORLD_WIDTH, 480, 0xc59b72).setAlpha(0.95);
    this.add.ellipse(SHELTER_CENTER_X, 800, 700, 430, 0xf0d0a8).setAlpha(0.95);
    this.add.image(SHELTER_CENTER_X, 690, TextureKey.shelter).setDepth(690).setScale(1.35, 1.18);
    this.add.text(SHELTER_CENTER_X, 565, "避难所", { color: "#ffffff", fontSize: "22px", fontStyle: "bold" }).setOrigin(0.5);

    this.drawBearRoutes();
    this.drawFence(SHELTER_CENTER_X, 820, 680, 420);
    this.drawShelterExpansionShell();
    this.makeShop("wood", "木材铺");
    this.makeShop("meat", "肉铺");
    this.makeShop("ore", "矿石铺");
    this.makeUpgradePads();
    this.makeTrees();
    this.makeObstacles();
    this.makeMine();
  }

  private drawFence(x: number, y: number, width: number, height: number): void {
    const graphics = this.add.graphics();
    const left = x - width / 2;
    const right = x + width / 2;
    const top = y - height / 2;
    const bottom = y + height / 2;
    const topDoor = shelterExpansion.topDoor;
    const rightDoor = shelterExpansion.rightDoor;
    const bottomDoor = shelterExpansion.door;
    graphics.lineStyle(5, 0xf6f7ef, 1);
    graphics.lineBetween(left + 32, top, topDoor.x - topDoor.width / 2, top);
    graphics.lineBetween(topDoor.x + topDoor.width / 2, top, right - 32, top);
    graphics.lineBetween(left, top + 32, left, bottom - 32);
    graphics.lineBetween(right, top + 32, right, rightDoor.y - rightDoor.height / 2);
    graphics.lineBetween(right, rightDoor.y + rightDoor.height / 2, right, bottom - 32);
    graphics.lineBetween(left + 32, bottom, bottomDoor.x - bottomDoor.width / 2, bottom);
    graphics.lineBetween(bottomDoor.x + bottomDoor.width / 2, bottom, right - 32, bottom);
    for (let i = 0; i < 22; i += 1) {
      const px = left + 20 + i * 30;
      if (px < topDoor.x - topDoor.width / 2 || px > topDoor.x + topDoor.width / 2) {
        graphics.lineBetween(px, top + 8, px, top + 38);
      }
      if (Math.abs(px - bottomDoor.x) > 70) {
        graphics.lineBetween(px, bottom - 42, px, bottom - 10);
      }
    }
  }

  private drawShelterExpansionShell(): void {
    const floor = shelterExpansion.expandedFloor;
    this.expansionFloor = this.add.rectangle(floor.x, floor.y, floor.width, floor.height, 0xb98559, 0.82)
      .setStrokeStyle(3, 0xf4d69a, 0.8)
      .setDepth(floor.y - 300)
      .setVisible(false);
    for (const wall of shelterExpansion.walls) {
      const wallView = this.add.rectangle(wall.x, wall.y, wall.width, wall.height, 0x6b3e2b, 0.92)
        .setStrokeStyle(2, 0xf4d69a, 0.55)
        .setDepth(wall.y);
      this.shelterWallViews.push(wallView);
    }
    for (const door of [shelterExpansion.topDoor, shelterExpansion.rightDoor, shelterExpansion.door]) {
      this.add.rectangle(door.x, door.y, door.width, door.height, 0xf0d0a8, 0.35)
        .setStrokeStyle(3, 0xffffff, 0.7)
        .setDepth(door.y);
    }
  }

  private drawBearRoutes(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(22, 0xc8dce6, 0.7);
    graphics.beginPath();
    graphics.moveTo(25, 450);
    graphics.lineTo(150, 510);
    graphics.lineTo(270, 575);
    graphics.lineTo(SHELTER_ATTACK_POINT.x, SHELTER_ATTACK_POINT.y);
    graphics.strokePath();
    graphics.lineStyle(16, 0xf6fbff, 0.45);
    graphics.beginPath();
    graphics.moveTo(700, 420);
    graphics.lineTo(610, 475);
    graphics.lineTo(470, 560);
    graphics.lineTo(SHELTER_ATTACK_POINT.x, SHELTER_ATTACK_POINT.y);
    graphics.strokePath();
  }

  private makeTrees(): void {
    const positions: Array<[string, number, number]> = [
      ["tree-1", 95, 230],
      ["tree-2", 185, 180],
      ["tree-extra-1", 500, 230],
      ["tree-extra-2", 620, 300],
      ["tree-extra-3", 80, 375]
    ];

    for (const [id, x, y] of positions) {
      if (!this.state.nodes[id]) {
        this.state.nodes[id] = { type: "wood", amount: 5 };
      }
      const shape = this.drawTree(x, y, 1);
      this.trees.push({ id, x, y, active: true, nextRespawn: 0, shape });
    }
  }

  private makeObstacles(): void {
    this.obstacles.push(this.makeObstacle("cluster-shelter", shelterExpansion.meatDebris.x, shelterExpansion.meatDebris.y, "清理树群\n扩展庇护所"));
    this.obstacles.push(this.makeObstacle("cluster-mine", 420, 410, "清理林带\n发现矿区"));
  }

  private makeMine(): void {
    const rock = this.add.container(610, 300);
    rock.setName("mineArea");
    rock.add(this.add.ellipse(0, 25, 110, 42, 0xb5c5c9));
    rock.add(this.add.polygon(0, 0, [0, -42, 44, -6, 22, 38, -38, 34, -52, -4], 0x8d99a3));
    rock.add(this.add.text(0, 56, "矿石点", { color: "#33414b", fontSize: "16px", fontStyle: "bold" }).setOrigin(0.5));
    rock.setAlpha(0);
  }

  private makeShop(kind: ShopKind, title: string): void {
    const layout = shopLayouts[kind];
    const { x, y } = layout.shop;
    const group = this.add.container(x, y);
    group.setDepth(y);
    const texture = kind === "wood" ? TextureKey.woodShop : kind === "meat" ? TextureKey.meatShop : TextureKey.oreShop;
    group.add(this.add.image(0, 0, texture));
    group.add(this.add.text(0, 2, title, { color: "#ffffff", fontSize: "15px", fontStyle: "bold", stroke: "#26313b", strokeThickness: 3 }).setOrigin(0.5));
    const veil = this.add.rectangle(0, 0, 100, 62, 0x23313d, 0.72);
    group.add(veil);
    const stockText = this.add.text(layout.stockPile.x, layout.stockPile.y + 26, "货 0", { color: "#203242", fontSize: "13px", fontStyle: "bold" }).setOrigin(0.5);
    const coinText = this.add.text(layout.coinPile.x, layout.coinPile.y + 26, "金 0", { color: "#186c38", fontSize: "13px", fontStyle: "bold" }).setOrigin(0.5);
    const stockPile = this.add.container(layout.stockPile.x, layout.stockPile.y);
    const coinPile = this.add.container(layout.coinPile.x, layout.coinPile.y);
    stockText.setDepth(layout.stockPile.y + 20);
    coinText.setDepth(layout.coinPile.y + 20);
    stockPile.setDepth(layout.stockPile.y);
    coinPile.setDepth(layout.coinPile.y);
    const stockBase = this.add.rectangle(layout.stockPile.x, layout.stockPile.y, 54, 30, 0xf4d69a, 0.45).setStrokeStyle(2, 0x7a4d32, 0.65).setDepth(layout.stockPile.y - 1);
    const coinBase = this.add.rectangle(layout.coinPile.x, layout.coinPile.y, 54, 30, 0xc9ffd5, 0.45).setStrokeStyle(2, 0x1b8c35, 0.65).setDepth(layout.coinPile.y - 1);
    const unloadBase = this.add.circle(layout.unloadPoint.x, layout.unloadPoint.y, 24, 0xffffff, 0.22).setStrokeStyle(3, 0x53e768, 0.8).setDepth(layout.unloadPoint.y - 1);
    const unloadText = this.add.text(layout.unloadPoint.x, layout.unloadPoint.y + 30, "卸货", { color: "#203242", fontSize: "12px", fontStyle: "bold" }).setOrigin(0.5).setDepth(layout.unloadPoint.y + 20);
    const workerBase = this.add.circle(layout.workerPoint.x, layout.workerPoint.y, 22, 0x2a3640, 0.28).setStrokeStyle(3, 0xf4d69a, 0.8).setDepth(layout.workerPoint.y - 1);
    const customers = this.createCustomerQueue(kind);
    this.shops.push({
      kind,
      x,
      y,
      title,
      group,
      lockedVeil: veil,
      stockText,
      coinText,
      stockPile,
      coinPile,
      customers,
      markers: [stockBase, coinBase, unloadBase, unloadText, workerBase]
    });
  }

  private createCustomerQueue(kind: ShopKind): Phaser.GameObjects.Container[] {
    const layout = shopLayouts[kind];
    const customers: Phaser.GameObjects.Container[] = [];
    for (let i = 0; i < 4; i += 1) {
      const customer = this.add.container(layout.queueStart.x - 30 + i * 20, layout.queueStart.y + i * 18);
      customer.add(this.add.image(0, 0, TextureKey.customer).setScale(0.82));
      customer.setDepth(customer.y);
      customers.push(customer);
    }
    return customers;
  }

  private makeUpgradePads(): void {
    this.addBuildPoint("axe", 360, 1138, "斧头升级", 10, 3, () => {
      this.axeLevel += 1;
      this.floatText(360, 1100, "斧头变多/更快", "#ffffff");
    });
    this.addBuildPoint("meat-shop", shopLayouts.meat.shop.x, shopLayouts.meat.shop.y, "肉铺开张", 6, 1, () => {
      this.state.shops.meat.unlocked = true;
      this.floatText(shopLayouts.meat.shop.x, shopLayouts.meat.shop.y - 44, "肉铺开张", "#ffffff");
    });
    this.addWorkerBuildPoint("wood");
    this.addWorkerBuildPoint("meat");
    this.addWorkerBuildPoint("ore");
    this.addBuildPoint("turret-left", turretBases.left.x, turretBases.left.y, "左线炮塔", 20, 1, () => {
      this.createTurret(turretBases.left);
      this.floatText(turretBases.left.x, turretBases.left.y - 38, "左线炮塔升起", "#ffffff");
    });
    this.addBuildPoint("turret-right", turretBases.right.x, turretBases.right.y, "右线炮塔", 20, 1, () => {
      this.createTurret(turretBases.right);
      this.floatText(turretBases.right.x, turretBases.right.y - 38, "右线炮塔升起", "#ffffff");
    });
  }

  private addWorkerBuildPoint(kind: ShopKind): void {
    const layout = shopLayouts[kind];
    const label = kind === "wood" ? "木材铺工人" : kind === "meat" ? "肉铺工人" : "矿石铺工人";
    this.addBuildPoint(`worker-${kind}`, layout.workerPoint.x, layout.workerPoint.y, label, 15, 1, () => {
      this.state.workers.push({ shop: kind, cycles: 0 });
      this.createWorker(kind);
      this.floatText(layout.workerPoint.x, layout.workerPoint.y - 36, `${label}加入`, "#ffffff");
    });
  }

  private addBuildPoint(id: string, x: number, y: number, label: string, required: number, maxLevel: number, onComplete: () => void): void {
    const pad = this.add.rectangle(x, y, 104, 58, 0x2a3640, 0.9).setStrokeStyle(3, 0xffffff, 0.7);
    const text = this.add.text(x, y, `${label}\n0/${required} 金币`, {
      color: "#ffffff",
      fontSize: "13px",
      align: "center"
    }).setOrigin(0.5);
    pad.setDepth(y - 1);
    text.setDepth(y);
    this.buildPoints.push({ id, x, y, required, label, done: false, text, pad, maxLevel, onComplete });
  }

  private makeObstacle(id: string, x: number, y: number, label: string): ObstacleView {
    const shape = this.add.container(x, y);
    shape.add(this.add.ellipse(0, 40, 132, 34, 0x5b6a73, 0.22));
    for (let i = 0; i < 5; i += 1) {
      shape.add(this.drawTree(-42 + i * 21, (i % 2) * 12, 0.82));
    }
    shape.add(this.add.rectangle(0, 70, 118, 14, 0x273743, 0.8));
    const bar = this.add.rectangle(-57, 70, 0, 10, 0x3cff7f).setOrigin(0, 0.5);
    shape.add(bar);
    shape.add(this.add.text(0, 95, label, { color: "#203242", fontSize: "14px", align: "center", fontStyle: "bold" }).setOrigin(0.5));
    return { id, x, y, label, shape, bar };
  }

  private drawTree(x: number, y: number, scale: number): Phaser.GameObjects.Container {
    const tree = this.add.container(x, y);
    tree.add(this.add.image(0, 0, TextureKey.tree).setScale(scale));
    tree.setDepth(y);
    return tree;
  }

  private createPlayer(): void {
    this.player = this.add.container(SHELTER_CENTER_X, 650);
    this.playerBody = this.add.circle(0, 0, 18, 0x4dd0ff, 0);
    this.player.add(this.playerBody);
    this.player.add(this.add.image(0, -8, TextureKey.player));
    this.stackLayer = this.add.container(0, 0);
    this.player.add(this.stackLayer);
    this.target = { x: this.player.x, y: this.player.y };
  }

  private configureCamera(): void {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(80, 120);
  }

  private createUi(): void {
    const firstUiIndex = this.children.list.length;
    this.add.rectangle(270, 34, 510, 52, 0x263747, 0.78).setStrokeStyle(2, 0xffffff, 0.25);
    this.statusText = this.add.text(28, 16, "", { color: "#ffffff", fontSize: "15px", fontStyle: "bold" });
    this.add.text(30, 76, "拖动/点击移动：靠近资源自动交互", { color: "#254050", fontSize: "16px", fontStyle: "bold" });
    this.add.rectangle(398, 82, 118, 14, 0x4b1e1e);
    this.shelterHpBar = this.add.rectangle(339, 82, 118, 14, 0x5dff70).setOrigin(0, 0.5);
    this.add.text(397, 100, "避难所生命", { color: "#254050", fontSize: "13px" }).setOrigin(0.5);
    this.hintText = this.add.text(270, 920, "", { color: "#ffffff", fontSize: "16px", align: "center", backgroundColor: "#263747aa", padding: { x: 10, y: 6 } }).setOrigin(0.5);
    for (const child of this.children.list.slice(firstUiIndex)) {
      const item = child as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth;
      item.setScrollFactor(0);
      item.setDepth(5000);
    }
  }

  private createMeatGuideArrow(): void {
    const target = shelterExpansion.meatDebris;
    const offset = shelterExpansion.meatArrowOffset;
    const arrow = this.add.container(target.x + offset.x, target.y + offset.y);
    arrow.add(this.add.triangle(0, 26, -18, -8, 18, -8, 0x47f26d).setStrokeStyle(3, 0xffffff));
    arrow.add(this.add.text(0, -28, "清理这里\n开肉铺", {
      color: "#ffffff",
      fontSize: "15px",
      fontStyle: "bold",
      align: "center",
      stroke: "#17303f",
      strokeThickness: 4
    }).setOrigin(0.5));
    arrow.setDepth(1200);
    arrow.setVisible(false);
    this.tweens.add({
      targets: arrow,
      y: arrow.y - 14,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    this.meatGuideArrow = arrow;
  }

  private updateMeatGuideArrow(): void {
    const show = shouldGuideToMeatExpansion(this.state) && !this.state.expansions.shelter;
    this.meatGuideArrow?.setVisible(show);
  }

  private setTargetFromPointer(pointer: Phaser.Input.Pointer): void {
    this.setTarget({ x: pointer.worldX, y: pointer.worldY });
  }

  private setTarget(point: Point): void {
    this.target = point;
  }

  private configurePromoMode(): void {
    if (!this.promoMode) {
      return;
    }

    this.axeLevel = 2;
    this.state.player.wood = 4;
    this.state.player.meat = 2;
    this.state.player.coin = 4;
    this.lastBearSpawn = -2500;
    this.target = PROMO_WAYPOINTS[0];
  }

  private updatePromoMode(time: number): void {
    if (!this.promoMode) {
      return;
    }

    if (this.promoStartedAt === 0) {
      this.promoStartedAt = time;
    }

    if (!this.promoCaptionShown && time - this.promoStartedAt > 450) {
      this.promoCaptionShown = true;
      this.floatText(this.player.x, this.player.y - 88, "宣传演示：自动冲突路线", "#ffffff");
    }

    const closestBear = this.findClosestBear();
    if (closestBear && Phaser.Math.Distance.Between(this.player.x, this.player.y, closestBear.body.x, closestBear.body.y) < 260) {
      this.setTarget({ x: closestBear.body.x, y: closestBear.body.y });
      return;
    }

    const waypoint = PROMO_WAYPOINTS[this.promoWaypointIndex % PROMO_WAYPOINTS.length];
    this.setTarget(waypoint);
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, waypoint.x, waypoint.y) < 54) {
      this.promoWaypointIndex += 1;
    }
  }

  private findClosestBear(): BearView | undefined {
    let closest: BearView | undefined;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const bear of this.bears) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, bear.body.x, bear.body.y);
      if (distance < closestDistance) {
        closest = bear;
        closestDistance = distance;
      }
    }
    return closest;
  }

  private movePlayer(delta: number): void {
    const dx = this.target.x - this.player.x;
    const dy = this.target.y - this.player.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 4) {
      return;
    }
    const step = Math.min(distance, 190 * delta);
    const next = {
      x: this.player.x + (dx / distance) * step,
      y: this.player.y + (dy / distance) * step
    };
    if (!this.isBlockedByShelterWall(next)) {
      this.player.x = next.x;
      this.player.y = next.y;
    }
    this.player.x = Phaser.Math.Clamp(this.player.x, 35, WORLD_WIDTH - 35);
    this.player.y = Phaser.Math.Clamp(this.player.y, 115, WORLD_HEIGHT - 35);
  }

  private isBlockedByShelterWall(point: Point): boolean {
    const bottomDoor = shelterExpansion.door;
    const inBottomDoorCorridor =
      Math.abs(point.x - bottomDoor.x) <= bottomDoor.width / 2 + 18 &&
      point.y >= bottomDoor.y - 92 &&
      point.y <= bottomDoor.y + bottomDoor.height / 2 + 28;
    const inDoor = [shelterExpansion.topDoor, shelterExpansion.rightDoor, bottomDoor].some((door) => {
      return Math.abs(point.x - door.x) <= door.width / 2 + 8 && Math.abs(point.y - door.y) <= door.height / 2 + 8;
    });
    if (inDoor || inBottomDoorCorridor) {
      return false;
    }
    return shelterExpansion.walls.some((wall) => {
      return Math.abs(point.x - wall.x) <= wall.width / 2 + 12 && Math.abs(point.y - wall.y) <= wall.height / 2 + 12;
    });
  }

  private updateAxes(time: number): void {
    this.axeAngle += 0.006 * (1 + this.axeLevel * 0.35) * (this.game.loop.delta || 16);
    const radius = 44 + this.axeLevel * 4;
    const count = Math.min(5, this.axeLevel + 1);
    this.player.list.filter((item) => item.name === "axe").forEach((item) => item.destroy());
    for (let i = 0; i < count; i += 1) {
      const angle = this.axeAngle + (Math.PI * 2 * i) / count;
      const axe = this.add.rectangle(Math.cos(angle) * radius, Math.sin(angle) * radius, 34, 8, 0xd8edf5).setName("axe");
      axe.rotation = angle;
      this.player.add(axe);
    }

    if (time - this.lastAxeHit > 350) {
      this.lastAxeHit = time;
      this.damageNearbyBears(2 + this.axeLevel);
    }
  }

  private handleHarvest(time: number): void {
    if (time - this.lastHarvest < 650) {
      return;
    }

    for (const tree of this.trees) {
      if (!tree.active || this.distanceTo(tree) > 72) {
        continue;
      }
      const amount = harvestNode(this.state, tree.id);
      if (amount > 0) {
        this.lastHarvest = time;
        tree.active = false;
        tree.nextRespawn = time + 5500;
        tree.shape.setAlpha(0.25);
        this.flyResource("wood", amount, { x: tree.x, y: tree.y - 35 }, this.playerStackPoint());
        this.floatText(tree.x, tree.y - 72, `+${amount} 木材`, "#246b3c");
        this.burst(tree.x, tree.y, 0xa86b42);
      }
      return;
    }

    if (this.state.expansions.mine && time - this.lastMine > 900 && this.distanceTo({ x: 610, y: 300 }) < 80) {
      this.lastMine = time;
      this.state.player.ore += 3;
      this.flyResource("ore", 3, { x: 610, y: 300 }, this.playerStackPoint());
      this.floatText(610, 245, "+3 矿石", "#59636d");
      this.burst(610, 300, 0xaeb9c2);
    }
  }

  private handleObstacleClearing(time: number): void {
    if (time - this.lastClear < 500) {
      return;
    }

    for (const obstacle of this.obstacles) {
      const model = this.state.obstacles[obstacle.id];
      if (model.cleared || this.distanceTo(obstacle) > 92) {
        continue;
      }
      this.lastClear = time;
      const drops = clearObstacle(this.state, obstacle.id, 1 + this.axeLevel * 0.45);
      obstacle.shape.rotation = Math.sin(time / 60) * 0.025;
      this.burst(obstacle.x, obstacle.y, 0xe1f3fb);
      if (model.cleared) {
        obstacle.shape.setAlpha(0.18);
        this.spawnDrops(obstacle.x, obstacle.y, drops);
        this.floatText(obstacle.x, obstacle.y - 95, "开荒完成!", "#186c38");
      }
      return;
    }
  }

  private handleShops(time: number): void {
    if (time - this.lastShop < 700 && time - this.lastCoinCollect < 450) {
      return;
    }

    for (const shop of this.shops) {
      const layout = shopLayouts[shop.kind];
      const stored = this.state.player[shop.kind];
      const nearUnload = this.distanceTo(layout.unloadPoint) <= 44;
      const deposited = nearUnload && time - this.lastShop >= 700 ? depositAtShop(this.state, shop.kind) : 0;
      if (deposited > 0) {
        this.lastShop = time;
        const stockTarget = shopLayouts[shop.kind].stockPile;
        this.flyResource(shop.kind, stored, this.playerStackPoint(), stockTarget);
        this.floatText(shop.x, shop.y - 62, `存入 ${deposited}`, "#ffffff");
        this.burst(stockTarget.x, stockTarget.y, this.resourceColor(shop.kind));
      }

      const coinPile = this.state.shops[shop.kind].coinPile;
      const nearCoins = this.distanceTo(layout.coinPile) <= 46;
      if (nearCoins && coinPile > 0 && time - this.lastCoinCollect >= 450) {
        const collected = collectShopCoins(this.state, shop.kind);
        this.lastCoinCollect = time;
        const coinSource = shopLayouts[shop.kind].coinPile;
        this.flyResource("coin", Math.min(collected, 16), coinSource, this.playerStackPoint());
        this.floatText(shop.x, shop.y - 82, `+${collected} 金币`, "#1b8c35");
        this.burst(coinSource.x, coinSource.y, 0x39e56c);
      }
    }
  }

  private updateCustomers(time: number): void {
    for (const shop of this.shops) {
      if (!this.state.shops[shop.kind].unlocked || this.state.shops[shop.kind].stock <= 0) {
        continue;
      }
      const lastServe = this.lastCustomerServe[shop.kind] ?? 0;
      if (time - lastServe < 1600) {
        continue;
      }
      if (!serveOneCustomer(this.state, shop.kind)) {
        continue;
      }

      this.lastCustomerServe[shop.kind] = time;
      const layout = shopLayouts[shop.kind];
      const customer = shop.customers.shift();
      if (!customer) {
        continue;
      }

      shop.customers.push(customer);
      const start = { x: customer.x, y: customer.y };
      const counter = shop.kind === "meat"
        ? { x: layout.shop.x, y: layout.shop.y + 34 }
        : { x: layout.shop.x, y: layout.shop.y - 34 };
      this.tweens.add({
        targets: customer,
        x: counter.x,
        y: counter.y,
        duration: 320,
        ease: "Cubic.easeOut",
        onComplete: () => {
          this.flyResource(shop.kind, 1, layout.stockPile, counter);
          this.flyResource("coin", this.state.shops[shop.kind].rate, counter, layout.coinPile);
          this.tweens.add({
            targets: customer,
            x: start.x,
            y: start.y + 70,
            alpha: 0,
            duration: 360,
            ease: "Cubic.easeIn",
            onComplete: () => {
              customer.setPosition(start.x, start.y);
              customer.setAlpha(1);
              this.resetCustomerQueue(shop);
            }
          });
        }
      });
    }
  }

  private resetCustomerQueue(shop: ShopView): void {
    const layout = shopLayouts[shop.kind];
    shop.customers.forEach((customer, index) => {
      this.tweens.add({
        targets: customer,
        x: layout.queueStart.x - 30 + index * 20,
        y: layout.queueStart.y + index * 18,
        duration: 240,
        ease: "Cubic.easeOut"
      });
    });
  }

  private handleUpgrades(): void {
    if (this.time.now - this.lastFund < 180) {
      return;
    }

    for (const point of this.buildPoints) {
      if (point.done || !this.isBuildPointAvailable(point) || this.distanceTo(point) >= 58) {
        continue;
      }
      const result = fundBuildPoint(this.state, point.id, point.required, 1);
      if (result.spent <= 0) {
        return;
      }
      this.lastFund = this.time.now;
      this.flyResource("coin", 1, this.playerStackPoint(), { x: point.x, y: point.y });
      this.pulseAt(point.x, point.y, 0x54ee71);
      if (result.completed) {
        point.onComplete();
        const levelState = levelUpBuildPoint(this.state, point.id, point.maxLevel);
        if (levelState.capped) {
          point.done = true;
          point.pad.setVisible(false);
          point.text.setVisible(false);
        } else {
          point.required += 8;
          this.floatText(point.x, point.y - 42, `Lv.${levelState.level + 1} 继续填充`, "#ffffff");
        }
      }
      return;
    }
  }

  private handlePickups(): void {
    for (const pickup of [...this.pickups]) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, pickup.icon.x, pickup.icon.y) > 46) {
        continue;
      }
      this.state.player[pickup.resource] += pickup.amount;
      this.flyResource(pickup.resource, pickup.amount, { x: pickup.icon.x, y: pickup.icon.y }, this.playerStackPoint());
      this.floatText(pickup.icon.x, pickup.icon.y - 28, `+${pickup.amount}`, "#ffffff");
      pickup.icon.destroy();
      this.pickups = this.pickups.filter((item) => item !== pickup);
    }
  }

  private updateWorker(delta: number): void {
    tickWorker(this.state, delta);
    for (const kind of Object.keys(this.workerSprites) as ShopKind[]) {
      const worker = this.workerSprites[kind];
      if (!worker) {
        continue;
      }
      const layout = shopLayouts[kind];
      const t = (this.time.now / 1000) % 3;
      const p = (t % 1.5) / 1.5;
      const eased = t < 1.5 ? p : 1 - p;
      worker.setPosition(
        Phaser.Math.Linear(layout.workerPoint.x, layout.stockPile.x, eased),
        Phaser.Math.Linear(layout.workerPoint.y, layout.stockPile.y, eased)
      );
    }
  }

  private updateBears(time: number, delta: number): void {
    const spawnDelay = this.promoMode ? 2300 : this.state.expansions.mine ? 3600 : this.state.expansions.shelter ? 4800 : 6200;
    if (time - this.lastBearSpawn > spawnDelay) {
      this.lastBearSpawn = time;
      if (this.promoMode) {
        const fromRight = Math.floor(time / spawnDelay) % 2 === 0;
        this.spawnBear(fromRight ? 700 : 25, fromRight ? 455 : 505);
      } else {
        this.spawnBear(this.state.expansions.mine ? 700 : 25, this.state.expansions.mine ? 420 : 450);
      }
    }

    for (const bear of [...this.bears]) {
      const target = SHELTER_ATTACK_POINT;
      const dx = target.x - bear.body.x;
      const dy = target.y - bear.body.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 4) {
        bear.body.x += (dx / distance) * bear.speed * delta;
        bear.body.y += (dy / distance) * bear.speed * delta;
      }
      if (distance < 62 && time - this.lastBearAttack > 850) {
        this.lastBearAttack = time;
        damageShelter(this.state, 4);
        this.floatText(SHELTER_ATTACK_POINT.x, SHELTER_ATTACK_POINT.y - 30, "-4", "#ff6969");
      }
      if (this.turrets.some((turret) => Phaser.Math.Distance.Between(turret.x, turret.y, bear.body.x, bear.body.y) < 150)) {
        bear.hp -= 0.045 * delta * 60;
      }
      bear.hpBar.width = Math.max(0, 34 * (bear.hp / bear.maxHp));
      if (bear.hp <= 0) {
        this.killBear(bear);
      }
    }
  }

  private spawnBear(x: number, y: number): void {
    const body = this.add.container(x, y);
    body.add(this.add.image(0, 0, TextureKey.bear));
    body.add(this.add.rectangle(0, -28, 38, 6, 0x7d1d1d));
    const hpBar = this.add.rectangle(-19, -28, 38, 6, 0x68f05f).setOrigin(0, 0.5);
    body.add(hpBar);
    this.bears.push({ hp: 9, maxHp: 9, speed: 36 + this.bears.length * 1.5, body, hpBar });
  }

  private damageNearbyBears(damage: number): void {
    for (const bear of this.bears) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, bear.body.x, bear.body.y) < 76) {
        bear.hp -= damage;
        this.burst(bear.body.x, bear.body.y, 0xff6b6b);
      }
    }
  }

  private killBear(bear: BearView): void {
    this.spawnDrops(bear.body.x, bear.body.y, { wood: 0, meat: 3, ore: 0, coin: 0 });
    bear.body.destroy();
    this.bears = this.bears.filter((item) => item !== bear);
  }

  private updateVisibility(): void {
    for (const shop of this.shops) {
      const unlocked = this.state.shops[shop.kind].unlocked;
      const visible = shop.kind === "meat" ? unlocked : true;
      shop.group.setVisible(visible);
      shop.lockedVeil.setVisible(visible && !unlocked);
      shop.group.setAlpha(unlocked ? 1 : 0.55);
      shop.stockText.setText(`货 ${this.state.shops[shop.kind].stock}`);
      shop.coinText.setText(`金 ${this.state.shops[shop.kind].coinPile}`);
      shop.stockText.setVisible(unlocked);
      shop.coinText.setVisible(unlocked);
      shop.stockPile.setVisible(unlocked);
      shop.coinPile.setVisible(unlocked);
      for (const marker of shop.markers) {
        marker.setVisible(shop.kind === "meat" ? unlocked : true);
      }
      for (const customer of shop.customers) {
        customer.setVisible(unlocked);
      }
      this.renderPile(shop.stockPile, shop.kind, this.state.shops[shop.kind].stock);
      this.renderPile(shop.coinPile, "coin", this.state.shops[shop.kind].coinPile);
    }

    const shelterExpanded = this.state.expansions.shelter;
    this.expansionFloor?.setVisible(shelterExpanded);
    for (const wall of this.shelterWallViews) {
      wall.setVisible(shelterExpanded);
    }

    const mineArea = this.children.getByName("mineArea");
    if (mineArea) {
      (mineArea as Phaser.GameObjects.Container).setAlpha(this.state.expansions.mine ? 1 : 0);
    }

    for (const obstacle of this.obstacles) {
      const model = this.state.obstacles[obstacle.id];
      obstacle.bar.width = 114 * (model.progress / model.required);
    }

    for (const tree of this.trees) {
      if (!tree.active && this.time.now > tree.nextRespawn) {
        this.state.nodes[tree.id].amount = 5;
        tree.active = true;
        tree.shape.setAlpha(1);
      }
    }
  }

  private updateUi(): void {
    this.updateStackBlocks();
    this.updateBuildPointText();
    this.statusText.setText(`木 ${this.state.player.wood}   肉 ${this.state.player.meat}   矿 ${this.state.player.ore}   金 ${this.state.player.coin}   斧 Lv.${this.axeLevel}`);
    this.shelterHpBar.width = 118 * (this.state.shelterHp / 100);

    const hint = this.state.shelterHp <= 0
      ? "避难所被攻破，刷新页面再试一次"
      : this.state.expansions.mine
        ? "矿区已开，卖矿石建炮塔守住熊群"
        : this.state.expansions.shelter
          ? "肉铺和工人点已出现，继续清理右上林带"
          : "砍树卖钱，靠近右侧关键树群开荒扩建";
    this.hintText.setText(hint);
  }

  private updateDepths(): void {
    this.player.setDepth(this.player.y);
    for (const bear of this.bears) {
      bear.body.setDepth(bear.body.y);
    }
    for (const worker of Object.values(this.workerSprites)) {
      if (worker) {
        worker.setDepth(worker.y);
      }
    }
    for (const turret of this.turrets) {
      turret.setDepth(turret.y);
    }
  }

  private updateBuildPointText(): void {
    for (const point of this.buildPoints) {
      if (point.done) {
        continue;
      }
      const visible = this.isBuildPointAvailable(point);
      point.pad.setVisible(visible);
      point.text.setVisible(visible);
      if (!visible) {
        continue;
      }
      const progress = this.state.buildPoints[point.id]?.progress ?? 0;
      const level = this.state.buildPoints[point.id]?.level ?? 0;
      const status = `${progress}/${point.required} 金币`;
      const levelLabel = point.maxLevel > 1 ? ` Lv.${level + 1}/${point.maxLevel}` : "";
      point.text.setText(`${point.label}${levelLabel}\n${status}`);
      point.pad.setFillStyle(0x2a3640, 0.9);
    }
  }

  private isBuildPointAvailable(point: BuildPointView): boolean {
    if (point.id === "meat-shop") {
      return this.state.expansions.shelter && !this.state.shops.meat.unlocked;
    }
    if (point.id === "worker-meat") {
      return this.state.shops.meat.unlocked && !this.state.workers.some((worker) => worker.shop === "meat");
    }
    if (point.id === "worker-ore") {
      return this.state.shops.ore.unlocked && !this.state.workers.some((worker) => worker.shop === "ore");
    }
    if (point.id === "worker-wood") {
      return !this.state.workers.some((worker) => worker.shop === "wood");
    }
    return true;
  }

  private updateStackBlocks(): void {
    this.stackLayer.removeAll(true);
    const blocks = buildStackBlocks({ bundle: this.state.player, maxBlocksPerResource: 110 });
    for (const block of blocks) {
      const token = this.makeResourceToken(block.resource, block.x, block.y, 0.7);
      token.setDepth(block.index);
      this.stackLayer.add(token);
      if (block.overflow > 0) {
        const label = this.add.text(block.x + 7, block.y - 2, `+${block.overflow}`, {
          color: "#ffffff",
          fontSize: "10px",
          fontStyle: "bold",
          stroke: "#17303f",
          strokeThickness: 2
        }).setOrigin(0.5);
        this.stackLayer.add(label);
      }
    }
  }

  private renderPile(container: Phaser.GameObjects.Container, resource: Resource, amount: number): void {
    container.removeAll(true);
    const visible = Math.min(resource === "wood" ? 34 : 24, amount);
    for (let i = 0; i < visible; i += 1) {
      const x = resource === "wood" ? (i % 2 === 0 ? -3 : 3) : -20 + (i % 5) * 10;
      const y = resource === "wood" ? 12 - i * 7 : 8 - Math.floor(i / 5) * 8;
      const scale = resource === "wood" ? 0.5 : 0.42;
      const token = this.makeResourceToken(resource, x, y, scale);
      token.setDepth(y);
      container.add(token);
    }
    if (amount > visible) {
      container.add(this.add.text(resource === "wood" ? 20 : 24, resource === "wood" ? -visible * 7 : -16, `+${amount - visible}`, {
        color: "#ffffff",
        fontSize: "11px",
        fontStyle: "bold",
        stroke: "#17303f",
        strokeThickness: 2
      }).setOrigin(0.5));
    }
  }

  private flyResource(resource: Resource, amount: number, from: Point, to: Point): void {
    const count = Math.min(10, Math.max(1, Math.ceil(amount / 2)));
    for (let i = 0; i < count; i += 1) {
      const token = this.makeResourceToken(
        resource,
        from.x + Phaser.Math.Between(-10, 10),
        from.y + Phaser.Math.Between(-10, 10),
        0.72
      );
      token.setDepth(1000);
      this.tweens.add({
        targets: token,
        x: to.x + Phaser.Math.Between(-12, 12),
        y: to.y + Phaser.Math.Between(-18, 8),
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 360 + i * 28,
        ease: "Cubic.easeOut",
        onComplete: () => {
          this.burst(token.x, token.y, this.resourceColor(resource));
          token.destroy();
        }
      });
    }
  }

  private playerStackPoint(): Point {
    return { x: this.player.x, y: this.player.y - 68 };
  }

  private makeResourceToken(resource: Resource, x: number, y: number, scale: number): Phaser.GameObjects.Container {
    const token = this.add.container(x, y);
    token.setScale(scale);
    const texture = resource === "wood"
      ? TextureKey.wood
      : resource === "meat"
        ? TextureKey.meat
        : resource === "ore"
          ? TextureKey.ore
          : TextureKey.coin;
    token.add(this.add.image(0, 0, texture));

    return token;
  }

  private resourceColor(resource: Resource): number {
    if (resource === "wood") {
      return 0x9d6033;
    }
    if (resource === "meat") {
      return 0xff6e7d;
    }
    if (resource === "ore") {
      return 0x8b98a4;
    }
    return 0x53e768;
  }

  private pulseAt(x: number, y: number, color: number): void {
    const ring = this.add.circle(x, y, 18, color, 0.18).setStrokeStyle(4, color);
    ring.setDepth(999);
    this.tweens.add({
      targets: ring,
      scaleX: 2.3,
      scaleY: 2.3,
      alpha: 0,
      duration: 520,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy()
    });
  }

  private createWorker(kind: ShopKind): void {
    const layout = shopLayouts[kind];
    const worker = this.add.container(layout.workerPoint.x, layout.workerPoint.y);
    worker.add(this.add.image(0, 0, TextureKey.worker));
    this.workerSprites[kind] = worker;
  }

  private createTurret(point: Point): void {
    const turret = this.add.container(point.x, point.y);
    turret.add(this.add.image(0, 0, TextureKey.turret));
    this.turrets.push(turret);
  }

  private spawnDrops(x: number, y: number, drops: ResourceBundle): void {
    for (const { resource, amount } of splitDropsIntoUnits(drops)) {
      const icon = this.add.container(
        x + Phaser.Math.Between(-32, 32),
        y + Phaser.Math.Between(-28, 28)
      );
      icon.add(this.makeResourceToken(resource, 0, 0, 0.72));
      this.pickups.push({ resource, amount, icon });
    }
  }

  private burst(x: number, y: number, color: number): void {
    for (let i = 0; i < 5; i += 1) {
      const dot = this.add.circle(x, y, 4, color);
      this.tweens.add({
        targets: dot,
        x: x + Phaser.Math.Between(-28, 28),
        y: y + Phaser.Math.Between(-28, 28),
        alpha: 0,
        duration: 450,
        onComplete: () => dot.destroy()
      });
    }
  }

  private floatText(x: number, y: number, text: string, color: string): void {
    const label = this.add.text(x, y, text, { color, fontSize: "18px", fontStyle: "bold", stroke: "#ffffff", strokeThickness: 3 }).setOrigin(0.5);
    this.tweens.add({
      targets: label,
      y: y - 32,
      alpha: 0,
      duration: 850,
      onComplete: () => label.destroy()
    });
  }

  private distanceTo(point: Point): number {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, point.x, point.y);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#142234",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 540,
    height: 960
  },
  scene: IceAgeScene
});
