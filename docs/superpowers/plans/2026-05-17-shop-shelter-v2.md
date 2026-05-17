# 避难所铺子与肉铺引导 v2 实施计划

> **给后续执行者：** 执行本计划时，逐项勾选任务。推荐使用 `superpowers:subagent-driven-development`，或使用 `superpowers:executing-plans` 按任务执行。步骤中的“红灯失败”是 TDD 流程，用来确认测试能抓住缺失行为；最终验收必须全部测试通过。

**目标：** 重构铺子售卖体验，让玩家在打熊拿到肉后能被清晰引导去扩建避难所，并在扩建后看到肉铺、肉堆货区、顾客队列和工人点自然出现。

**架构：** 保持 Phaser 3 + TypeScript。纯规则放在 `src/gameLogic.ts`，空间配置放在 `src/sceneConfig.ts`，视觉与交互接线在 `src/main.ts`。本计划优先修正铺子体验、肉铺解锁引导、点位误触和售卖动线，不重做完整战斗系统。

**技术栈：** Phaser 3.90、TypeScript、Vite、Vitest、当前生成纹理/内部参考素材。

---

## 设计原则

- 肉铺不是“凭空解锁”，而是玩家拿到肉后，被箭头引导去清理避难所旁杂物；清理后避难所扩建，肉铺和肉相关点位一起出现。
- 铺子需要有明确空间：玩家卸货点、货物堆叠点、金币产出点、顾客队列、工人点，彼此要拉开距离，避免误触。
- 顾客不是静态装饰。顾客应排队，轮到后拿走 1 个对应货物，离开，留下金币。
- 掉落物和货物堆叠不显示数字，用“一个单位一个图形”的方式表现。
- 墙体和门只做最小真实感：避难所有可见墙体和门洞，玩家不能穿墙，只能从门进入。

## 文件结构

- 修改 `src/gameLogic.ts`：新增肉铺引导状态、顾客消费规则、每次只消费 1 个货物。
- 修改 `src/gameLogic.test.ts`：测试肉铺引导、顾客消费、金币来源、工人不与卸货点混淆的规则。
- 修改 `src/sceneConfig.ts`：新增避难所区域、墙体、门、肉铺扩建区、卸货点、工人点、顾客队列坐标。
- 修改 `src/main.ts`：实现箭头引导、扩建显示、墙体碰撞、门洞通行、顾客移动、铺子堆叠显示。
- 可选修改 `src/visualAssets.ts`：优化肉、木材、顾客、铺子相关临时纹理。

## 任务 1：肉铺引导规则

**文件：**
- 修改：`src/gameLogic.ts`
- 修改：`src/gameLogic.test.ts`

- [ ] **步骤 1：写肉铺引导测试**

在 `src/gameLogic.test.ts` 添加：

```ts
it("玩家持有肉且肉铺未解锁时，需要显示肉铺扩建引导", () => {
  const state = createInitialState();
  state.player.meat = 1;
  state.shops.meat.unlocked = false;

  expect(shouldGuideToMeatExpansion(state)).toBe(true);

  state.shops.meat.unlocked = true;
  expect(shouldGuideToMeatExpansion(state)).toBe(false);
});
```

从 `./gameLogic` 导入 `shouldGuideToMeatExpansion`。

- [ ] **步骤 2：运行测试确认红灯有效**

运行：`npm test`

预期：测试失败，原因是 `shouldGuideToMeatExpansion` 尚未实现。这个失败说明测试能抓住当前缺失行为。

- [ ] **步骤 3：实现最小规则**

在 `src/gameLogic.ts` 添加：

```ts
export function shouldGuideToMeatExpansion(state: GameState): boolean {
  return state.player.meat > 0 && !state.shops.meat.unlocked;
}
```

- [ ] **步骤 4：运行测试确认通过**

运行：`npm test`

预期：全部测试通过。

## 任务 2：肉铺扩建点和箭头引导

**文件：**
- 修改：`src/sceneConfig.ts`
- 修改：`src/main.ts`

- [ ] **步骤 1：添加肉铺扩建区配置**

在 `src/sceneConfig.ts` 添加：

```ts
export const shelterExpansion = {
  meatDebris: { x: 430, y: 610 },
  meatArrowOffset: { x: 0, y: -90 },
  expandedFloor: { x: 342, y: 650, width: 190, height: 150 },
  door: { x: 270, y: 760, width: 86, height: 42 },
  walls: [
    { x: 270, y: 555, width: 320, height: 24 },
    { x: 110, y: 650, width: 24, height: 180 },
    { x: 430, y: 650, width: 24, height: 180 }
  ]
};
```

- [ ] **步骤 2：在场景中显示箭头**

在 `src/main.ts` 中新增一个 `meatGuideArrow?: Phaser.GameObjects.Container` 字段。每帧根据 `shouldGuideToMeatExpansion(this.state)` 控制显示：

```ts
const show = shouldGuideToMeatExpansion(this.state) && !this.state.expansions.shelter;
this.meatGuideArrow?.setVisible(show);
```

箭头位置指向 `shelterExpansion.meatDebris`。

- [ ] **步骤 3：箭头表现**

箭头用一个简单容器：绿色箭头或三角形，加轻微上下 tween。文字写“清理这里开肉铺”。

- [ ] **步骤 4：手动检查**

打开 `http://127.0.0.1:5173`。打熊捡到肉后，若肉铺未解锁，角色附近或目标点应出现箭头，引导清理避难所旁杂物。

## 任务 3：避难所扩建、墙体和门

**文件：**
- 修改：`src/main.ts`
- 修改：`src/sceneConfig.ts`

- [ ] **步骤 1：绘制扩建区域**

在 `src/main.ts` 中，肉铺未解锁前只显示杂物/树群；清理后显示 `expandedFloor` 区域、围墙和肉铺区域。

- [ ] **步骤 2：添加最小墙体碰撞**

在 `movePlayer(delta)` 中，计算移动后的目标点。如果点落入墙体矩形且不在门洞范围内，则阻止该轴移动。

伪代码：

```ts
const next = { x: this.player.x + vx, y: this.player.y + vy };
if (!this.isBlockedByShelterWall(next)) {
  this.player.setPosition(next.x, next.y);
}
```

- [ ] **步骤 3：实现门洞通行**

`isBlockedByShelterWall(point)` 中，如果点位于 `shelterExpansion.door` 矩形内，则允许通过。

- [ ] **步骤 4：手动检查**

玩家不能穿墙进入避难所，只能从门进入。不要做复杂寻路，只做矩形阻挡。

## 任务 4：铺子点位分离

**文件：**
- 修改：`src/sceneConfig.ts`
- 修改：`src/main.ts`

- [ ] **步骤 1：重设铺子布局坐标**

在 `src/sceneConfig.ts` 中让每个铺子至少有 5 个点位：

```ts
wood: {
  shop: { x: 150, y: 715 },
  unloadPoint: { x: 150, y: 790 },
  stockPile: { x: 126, y: 650 },
  coinPile: { x: 178, y: 650 },
  workerPoint: { x: 96, y: 690 },
  queueStart: { x: 150, y: 830 }
}
```

肉铺和矿石铺使用同样结构，点位之间至少间隔 55px。

- [ ] **步骤 2：修改 `ShopLayout` 类型**

在 `src/sceneConfig.ts` 中给 `ShopLayout` 添加 `unloadPoint`。

- [ ] **步骤 3：卸货交互只在卸货点触发**

在 `src/main.ts` 中，`handleShops` 不再用 `distanceTo(shop)` 判断卸货，而是用 `distanceTo(layout.unloadPoint)`。

- [ ] **步骤 4：收金币交互只在金币堆触发**

收金币用 `distanceTo(layout.coinPile)`，不要和卸货点或工人点重叠。

- [ ] **步骤 5：手动检查**

玩家站在卸货点只卸货，站在工人点才填金币雇佣工人，两个行为不互相误触。

## 任务 5：顾客队列消费 1 个货物并留下金币

**文件：**
- 修改：`src/gameLogic.ts`
- 修改：`src/gameLogic.test.ts`
- 修改：`src/main.ts`

- [ ] **步骤 1：写顾客消费测试**

在 `src/gameLogic.test.ts` 添加：

```ts
it("顾客每次只买走 1 个铺子库存并留下对应金币", () => {
  const state = createInitialState();
  state.shops.wood.stock = 2;

  expect(serveOneCustomer(state, "wood")).toBe(true);
  expect(state.shops.wood.stock).toBe(1);
  expect(state.shops.wood.coinPile).toBe(1);
});
```

导入 `serveOneCustomer`。

- [ ] **步骤 2：运行测试确认红灯有效**

运行：`npm test`

预期：测试失败，因为 `serveOneCustomer` 尚未实现。

- [ ] **步骤 3：实现顾客消费规则**

在 `src/gameLogic.ts` 添加：

```ts
export function serveOneCustomer(state: GameState, shop: ShopKind): boolean {
  const target = state.shops[shop];
  if (!target.unlocked || target.stock <= 0) {
    return false;
  }
  target.stock -= 1;
  target.coinPile += target.rate;
  return true;
}
```

- [ ] **步骤 4：场景接入顾客动画**

在 `src/main.ts` 中，为每个铺子维护顾客队列动画：
- 队首顾客移动到柜台。
- 若 `serveOneCustomer` 成功，从 `stockPile` 飞出 1 个货物到顾客，再从顾客位置飞出金币到 `coinPile`。
- 顾客离开队列，再生成新顾客排到末尾。

- [ ] **步骤 5：取消自动加工或降低自动加工**

如果顾客系统接管售卖，`tickShops` 自动加工应暂停或只作为工人辅助处理。优先让“顾客拿货留下金币”成为主要金币来源。

## 任务 6：掉落物去数字，形状表达单位

**文件：**
- 修改：`src/main.ts`
- 可选修改：`src/visualAssets.ts`

- [ ] **步骤 1：修改 `spawnDrops`**

删除拾取物上的数字文本：

```ts
icon.add(this.add.text(...))
```

改成只显示对应资源纹理。

- [ ] **步骤 2：资源单位散落**

每个单位掉落随机偏移，肉就是肉块，木材就是木材块，矿石就是矿石块。

- [ ] **步骤 3：手动检查**

熊死亡后地上出现 3 个肉块，没有数字。清理树群后出现多个木材/矿石单位，没有数字。

## 任务 7：木材铺堆叠参考图效果

**文件：**
- 修改：`src/main.ts`
- 修改：`src/visualAssets.ts`

- [ ] **步骤 1：调整 `renderPile`**

木材堆不要平铺，改成靠近参考图的竖向堆叠：

```ts
const x = resource === "wood" ? 0 : -20 + (i % 5) * 10;
const y = resource === "wood" ? 8 - i * 7 : 8 - Math.floor(i / 5) * 8;
```

- [ ] **步骤 2：木材块略微错位**

木材堆每层轻微左右偏移：

```ts
const x = (i % 2 === 0 ? -3 : 3);
```

- [ ] **步骤 3：金币/肉/矿石堆继续使用小堆，但增加高度**

肉、矿石、金币最多显示 24 个单位，超过后再显示 `+N` 辅助角标。木材堆优先显示高度。

- [ ] **步骤 4：手动检查**

木材铺旁货物看起来像参考图里的木材柱，而不是平面棋子。

## 任务 8：验证

**文件：**
- 只在发现问题时修改前面任务涉及的文件。

- [ ] **步骤 1：自动测试**

运行：`npm test`

预期：全部测试通过。

- [ ] **步骤 2：构建**

运行：`npm run build`

预期：构建通过。Phaser 包体积警告可接受。

- [ ] **步骤 3：试玩检查**

打开 `http://127.0.0.1:5173`，检查：
- 打熊捡肉后出现肉铺扩建引导。
- 清理杂物后肉铺、肉堆货区、顾客队列、工人点一起出现。
- 卸货点、金币点、工人点不重叠。
- 顾客拿走 1 个货物并留下金币。
- 掉落物无数字。
- 木材堆接近参考图的柱状堆叠。
- 玩家不能穿墙，只能从门进出避难所。

## 本轮不做

- 不重做完整战斗系统。
- 不做完整寻路。
- 不切 Unity/Three.js。
- 不处理公开素材授权。
- 不做所有商铺最终美术，只先把木材/肉铺体验立住。

## 自检

- 覆盖项：肉铺引导、避难所扩建、墙体和门、点位分离、顾客队列售卖、掉落去数字、木材铺参考图堆叠。
- 占位扫描：没有 TBD、TODO、以后再补等占位内容。
- 命名一致性：`shouldGuideToMeatExpansion`、`serveOneCustomer`、`ShopLayout.unloadPoint` 都在计划中定义后再使用。
