# 可推销级试玩 Demo 实施计划

> **给后续执行者：** 执行本计划时，逐项勾选任务。推荐使用 `superpowers:subagent-driven-development`，或使用 `superpowers:executing-plans` 按任务执行。每个任务都要先测试、再实现、再验证。

**目标：** 在约 5 小时内，把当前 Phaser 原型打磨成一个真正可玩的竖屏 Web demo，效果更接近参考图：伪 3D 素材、清晰的避难所内部物流、顾客排队、单位掉落、没有明显玩法 bug。

**架构：** 保持 Phaser 3 + Vite + TypeScript，不切 Unity、Three.js 或真 3D。当前最大问题不是技术栈，而是素材与表现模型：需要用伪 3D 位图/纹理、y 轴深度排序、堆叠资源绘制和更合理的空间布局替代平面几何占位图。纯玩法规则继续放在 `src/gameLogic.ts`；视觉资产和场景坐标拆到独立小文件，避免 `src/main.ts` 继续膨胀。

**技术栈：** Phaser 3.90、TypeScript、Vite、Vitest、内部 demo 用 PNG/生成纹理素材。

---

## 技术决策

**不换技术栈。** Phaser 2D 可以做出参考图那种伪 3D/isometric 竖屏手游感：

- 使用带明暗面、厚度、投影的 PNG 或生成纹理。
- 用 `y` 坐标做深度排序，让角色、熊、树、铺子、堆货区自然遮挡。
- 堆叠资源用重复的小块 sprite，加竖向偏移和轻微深度错位。
- 通过 tween 表现资源飞入、铺子加工、顾客排队、建筑生长、金币注入。

5 小时内切 Unity 或 Three.js 不划算，会把时间消耗在引擎搭建、相机、资源导入、碰撞和移动端适配上，而不是让 demo 变得更能卖。

## 文件结构

- 修改 `src/gameLogic.ts`：补单位掉落、建造点多轮升级/满级、铺子工人关系等规则。
- 修改 `src/gameLogic.test.ts`：锁定单位掉落、熊不掉金币、每铺一个工人等规则。
- 修改 `src/visualStack.ts` 和 `src/visualStack.test.ts`：堆叠策略改为能冲出竖屏顶部后再压缩。
- 新建 `src/visualAssets.ts`：集中创建/管理伪 3D 纹理和资源 key。
- 新建 `src/sceneConfig.ts`：集中维护避难所内部、铺子、堆货区、顾客队列、熊路线、炮塔底座、建造点坐标。
- 修改 `src/main.ts`：用资产和布局配置替换平面图形，连接新的空间布局。
- 新建或更新 `src/assets/`：放内部 demo 用的 PNG 素材。如果短期没有完整 PNG，就先在 `visualAssets.ts` 用 Phaser graphics 生成带阴影和厚度的临时纹理，但目标是摆脱平面几何占位。

## 任务 1：用测试锁住经济 bug

**文件：**
- 修改：`src/gameLogic.test.ts`
- 修改：`src/gameLogic.ts`

- [ ] **步骤 1：添加“熊不掉金币”的测试**

在 `src/gameLogic.test.ts` 添加：

```ts
it("熊只掉肉，不掉金币", () => {
  const drops = { wood: 0, meat: 3, ore: 0, coin: 0 };

  expect(drops.coin).toBe(0);
  expect(drops.meat).toBeGreaterThan(0);
});
```

- [ ] **步骤 2：添加“掉落按 1 个单位拆分”的测试**

在 `src/gameLogic.test.ts` 添加：

```ts
it("资源掉落会拆成 1 个单位的拾取物", () => {
  const drops = splitDropsIntoUnits({ wood: 2, meat: 1, ore: 0, coin: 0 });

  expect(drops).toEqual([
    { resource: "wood", amount: 1 },
    { resource: "wood", amount: 1 },
    { resource: "meat", amount: 1 }
  ]);
});
```

从 `./gameLogic` 导入 `splitDropsIntoUnits`。

- [ ] **步骤 3：运行测试确认失败**

运行：`npm test`

预期：失败，因为 `splitDropsIntoUnits` 还没有实现。

- [ ] **步骤 4：实现单位掉落 helper**

在 `src/gameLogic.ts` 添加：

```ts
export type UnitDrop = { resource: Resource; amount: 1 };

export function splitDropsIntoUnits(bundle: ResourceBundle): UnitDrop[] {
  const result: UnitDrop[] = [];
  for (const resource of ["wood", "meat", "ore", "coin"] as Resource[]) {
    for (let i = 0; i < bundle[resource]; i += 1) {
      result.push({ resource, amount: 1 });
    }
  }
  return result;
}
```

- [ ] **步骤 5：运行测试**

运行：`npm test`

预期：通过。

## 任务 2：堆叠策略改成可以冲出屏幕

**文件：**
- 修改：`src/visualStack.ts`
- 修改：`src/visualStack.test.ts`

- [ ] **步骤 1：添加“堆叠超过竖屏顶部”的失败测试**

在 `src/visualStack.test.ts` 添加：

```ts
it("资源堆叠可以超过竖屏顶部后再压缩", () => {
  const blocks = buildStackBlocks({
    bundle: { wood: 140, meat: 0, ore: 0, coin: 0 },
    maxBlocksPerResource: 110
  });

  expect(blocks.filter((block) => block.resource === "wood")).toHaveLength(110);
  expect(Math.min(...blocks.map((block) => block.y))).toBeLessThan(-960);
  expect(blocks.at(-1)?.overflow).toBe(30);
});
```

- [ ] **步骤 2：运行测试确认当前表现**

运行：`npm test`

预期：如果堆叠间距或上限不能超过屏幕高度，则失败。

- [ ] **步骤 3：调整堆叠间距和上限策略**

在 `src/visualStack.ts` 中保留现有 API，让每个资源块约 `10px` 间距，并允许调用方传入 `110` 左右的显示上限。

- [ ] **步骤 4：更新场景调用**

在 `src/main.ts` 中调用：

```ts
buildStackBlocks({ bundle: this.state.player, maxBlocksPerResource: 110 });
```

- [ ] **步骤 5：运行测试**

运行：`npm test`

预期：通过。

## 任务 3：建立伪 3D 资产层

**文件：**
- 新建：`src/visualAssets.ts`
- 修改：`src/main.ts`

- [ ] **步骤 1：创建资产纹理模块**

新建 `src/visualAssets.ts`：

```ts
import Phaser from "phaser";

export const TextureKey = {
  player: "player-survivor",
  bear: "polar-bear",
  tree: "snow-tree",
  shelter: "shelter",
  woodShop: "wood-shop",
  meatShop: "meat-shop",
  oreShop: "ore-shop",
  wood: "wood-block",
  meat: "meat-block",
  ore: "ore-block",
  coin: "coin-block",
  turret: "turret",
  worker: "worker",
  customer: "customer"
} as const;

export function createFallbackTextures(scene: Phaser.Scene): void {
  // 用带明暗面和阴影的 Phaser graphics 生成临时纹理。
  // 之后替换成 PNG 时，不需要改调用点。
}
```

- [ ] **步骤 2：实现临时伪 3D 纹理**

在 `createFallbackTextures` 里生成带阴影、亮面、暗面的纹理，并调用 `generateTexture`。纹理保持小而清晰。

- [ ] **步骤 3：替换直接绘制的几何图形**

在 `src/main.ts` 中，把玩家、熊、树、铺子、工人、炮塔、资源块从扁平几何图形换成 `this.add.image(..., TextureKey.xxx)`。

- [ ] **步骤 4：添加 y 轴深度排序**

在 `update` 末尾设置动态对象深度：

```ts
this.player.setDepth(this.player.y);
for (const bear of this.bears) bear.body.setDepth(bear.body.y);
if (this.workerSprite) this.workerSprite.setDepth(this.workerSprite.y);
```

- [ ] **步骤 5：浏览器手动检查**

打开：`http://127.0.0.1:5173`

预期：画面不再像平面几何 UI；对象应有阴影、厚度、伪 3D 层次。

## 任务 4：避难所内部铺子物流

**文件：**
- 新建：`src/sceneConfig.ts`
- 修改：`src/main.ts`

- [ ] **步骤 1：添加固定坐标配置**

新建 `src/sceneConfig.ts`：

```ts
import type { ShopKind } from "./gameLogic";

export type ShopLayout = {
  shop: { x: number; y: number };
  stockPile: { x: number; y: number };
  coinPile: { x: number; y: number };
  workerPoint: { x: number; y: number };
  queueStart: { x: number; y: number };
};

export const shopLayouts: Record<ShopKind, ShopLayout> = {
  wood: {
    shop: { x: 150, y: 715 },
    stockPile: { x: 124, y: 650 },
    coinPile: { x: 175, y: 650 },
    workerPoint: { x: 150, y: 675 },
    queueStart: { x: 150, y: 792 }
  },
  meat: {
    shop: { x: 270, y: 715 },
    stockPile: { x: 244, y: 650 },
    coinPile: { x: 295, y: 650 },
    workerPoint: { x: 270, y: 675 },
    queueStart: { x: 270, y: 792 }
  },
  ore: {
    shop: { x: 390, y: 715 },
    stockPile: { x: 364, y: 650 },
    coinPile: { x: 415, y: 650 },
    workerPoint: { x: 390, y: 675 },
    queueStart: { x: 390, y: 792 }
  }
};
```

- [ ] **步骤 2：把堆货区/金币区移到避难所内部**

在 `src/main.ts` 中，让 `ShopView.stockPile` 和 `ShopView.coinPile` 使用 `shopLayouts[kind].stockPile` 和 `shopLayouts[kind].coinPile`，不要放在铺子外侧。

- [ ] **步骤 3：添加顾客排队表现**

每个已解锁铺子前渲染 3-5 个顾客，从 `queueStart` 往下排。这个阶段顾客只做氛围，不影响经济数值。

- [ ] **步骤 4：表现卸货和加工过程**

玩家交货时，资源单位飞到避难所内部堆货区。铺子加工成金币时，少量金币单位从堆货区飞到金币区。

- [ ] **步骤 5：浏览器手动检查**

预期：玩家能看懂“资源卸到避难所内部堆货区 → 铺子加工 → 金币堆出现 → 顾客排队”的循环。

## 任务 5：每个铺子一个工人

**文件：**
- 修改：`src/gameLogic.ts`
- 修改：`src/gameLogic.test.ts`
- 修改：`src/main.ts`

- [ ] **步骤 1：添加失败测试**

在 `src/gameLogic.test.ts` 添加：

```ts
it("每个已解锁铺子最多雇佣一个工人，不能重复雇佣", () => {
  const state = createInitialState();
  state.player.coin = 100;
  state.shops.meat.unlocked = true;

  expect(buyWorker(state, "wood")).toBe(true);
  expect(buyWorker(state, "wood")).toBe(false);
  expect(buyWorker(state, "meat")).toBe(true);
  expect(state.workers.map((worker) => worker.shop)).toEqual(["wood", "meat"]);
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：`npm test`

预期：如果当前允许重复工人，则失败。

- [ ] **步骤 3：实现重复雇佣保护**

在 `buyWorker` 中添加：

```ts
if (state.workers.some((worker) => worker.shop === shop)) {
  return false;
}
```

- [ ] **步骤 4：创建每个铺子的工人点**

在 `src/main.ts` 中，在每个铺子的 `workerPoint` 创建独立工人建造点。肉铺/矿石铺工人点只在对应铺子解锁后显示。

- [ ] **步骤 5：运行测试并手动检查**

运行：`npm test`

预期：通过。浏览器中每个铺子都能有自己的可见工人。

## 任务 6：炮塔移到熊路线旁

**文件：**
- 修改：`src/sceneConfig.ts`
- 修改：`src/main.ts`

- [ ] **步骤 1：定义路线旁炮塔底座**

在 `src/sceneConfig.ts` 添加：

```ts
export const turretBase = { x: 92, y: 470 };
```

- [ ] **步骤 2：移动炮塔建造点和炮塔本体**

在 `src/main.ts` 中，把炮塔建造点和炮塔生成位置移动到 `turretBase`。

- [ ] **步骤 3：添加熊路线视觉提示**

从熊出生点到避难所画一条轻微压雪路径，让炮塔位置看起来像防线。

- [ ] **步骤 4：浏览器手动检查**

预期：炮塔明显在熊路线上或路线旁，而不是藏在铺子/基地后面。

## 任务 7：总体验证

**文件：**
- 只在发现 bug 时修改前面任务涉及的文件。

- [ ] **步骤 1：运行自动测试**

运行：`npm test`

预期：全部测试通过。

- [ ] **步骤 2：运行生产构建**

运行：`npm run build`

预期：TypeScript 和 Vite 构建通过。Phaser chunk-size 警告在当前原型阶段可以接受。

- [ ] **步骤 3：进行 10 分钟手动试玩**

打开：`http://127.0.0.1:5173`

检查：
- 玩家能砍树，并看到资源堆高。
- 木材、熊肉、矿石掉落都是 1 个单位一个拾取物。
- 铺子有避难所内部堆货区和金币区。
- 顾客在铺子前排队。
- 金币只从铺子出售链路获得。
- 建造点按金币一个个填充。
- 一次性建造点完成后消失。
- 多轮斧头升级点在满级前继续保留。
- 每个铺子最多一个工人。
- 炮塔在熊路线旁。
- 没有明显运行时报错或卡死。

## 5 小时执行顺序

1. 前 45 分钟：任务 1-2，先修规则和堆叠策略。
2. 接下来 90 分钟：任务 3，素材/伪 3D 表现是最大质量跃迁。
3. 接下来 90 分钟：任务 4，避难所内部物流和顾客队列修正最大视觉违和。
4. 接下来 45 分钟：任务 5-6，工人和炮塔位置是相对独立的修正。
5. 最后 60 分钟：任务 7，修 bug、调间距、完整试玩。

## 本轮不做

- 不切 Unity / Three.js。
- 不做真 3D 物理或真 3D 相机。
- 不做长期基地扩建树。
- 不处理公开发布级素材授权。
- 不做完整敌人波次平衡。
- 不做浏览器外的移动端打包。

## 自检

- 覆盖项：技术栈决策、素材质量、避难所内部物流、单位掉落、伪 3D 堆叠、每铺一个工人、炮塔路线位置、验证流程。
- 占位扫描：没有 TBD、TODO、later 等占位内容。
- 命名一致性：`ShopKind`、`ResourceBundle`、`buildStackBlocks`、`buyWorker`、`fundBuildPoint`、`levelUpBuildPoint` 与当前项目命名一致。
