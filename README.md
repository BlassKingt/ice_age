# Ice Survival Demo / 冰川逃亡

一个还在快速迭代的网页小游戏 Demo。你在冰川地图里收集资源、卖钱、扩建避难所，然后想办法顶住越来越乱的局面。

This is a small browser game demo about surviving on a frozen map: gather resources, sell them, expand the shelter, and survive the incoming chaos.

## 在线试玩 / Play

- 试玩地址 / Live demo: <https://ice.minitechs.xyz/>
- 反馈表 / Feedback form: <https://my.feishu.cn/share/base/form/shrcnvK0cCnI1zJpEPzrIMZMgcc>
- MiniTechs 主页 / Hub: <https://www.minitechs.xyz/>

## 现在能玩什么 / What You Can Do

- 点击或拖动，让角色移动。
- 砍树、捡肉、收集资源。
- 把资源送到店铺，换成金币。
- 用金币和资源扩建避难所。
- 解锁新区域和新资源点。
- 处理不断靠近的熊，别让避难所太快崩掉。

In short: move, gather, sell, expand, unlock, and defend.

## 为什么做这个 / Why This Exists

这是一个公开 v0.1 Demo，还很粗糙，但已经可以玩出基础循环了。

我想用它做一个轻量实验：先把一个不完美的小版本放出来，然后根据真实试玩反馈继续改。  
如果你觉得哪里无聊、别扭、太慢、太乱，或者反而有点好笑，都可以直接提建议。

This is a public v0.1 demo. It is intentionally small and a little rough. The fun part is seeing what should change next based on real feedback.

## 本地运行 / Local Development

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173/
```

Promo capture mode:

```text
http://127.0.0.1:5173/?mode=promo
```

`?mode=promo` 只用于录制展示素材，不是普通玩家入口。

## 常用命令 / Scripts

```bash
npm test
npm run build
```

## 当前版本说明 / Current Notes

- v0.1 重点是跑通基础玩法循环。
- 桌面端体验更稳，手机端可以打开但还不是主要优化目标。
- 欢迎反馈玩法想法、节奏问题、bug、操作别扭点，或者任何“这个地方应该更夸张一点”的建议。

## 后续可能会改 / Possible Next Steps

- 更清楚的失败反馈和阶段目标。
- 更有冲击感的熊群压力。
- 更顺手的资源搬运和卸货体验。
- 根据反馈加入 1-2 个小机制，做成下一版。
