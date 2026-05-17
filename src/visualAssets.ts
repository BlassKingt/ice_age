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
  makeTexture(scene, TextureKey.tree, 72, 96, (g) => {
    g.fillStyle(0x26313b, 0.22).fillEllipse(36, 82, 48, 14);
    g.fillStyle(0x8a5738).fillRect(31, 55, 10, 26);
    g.fillStyle(0x5d94bb).fillTriangle(36, 18, 8, 66, 64, 66);
    g.fillStyle(0x87c2df).fillTriangle(36, 0, 14, 43, 58, 43);
    g.fillStyle(0xdaf2f8).fillTriangle(36, 10, 20, 36, 52, 36);
    g.fillStyle(0xffffff, 0.7).fillTriangle(29, 18, 20, 43, 36, 43);
  });

  makeTexture(scene, TextureKey.player, 54, 68, (g) => {
    g.fillStyle(0x26313b, 0.25).fillEllipse(27, 58, 42, 14);
    g.fillStyle(0x2479a8).fillRoundedRect(13, 25, 28, 31, 8);
    g.fillStyle(0x59d4ff).fillRoundedRect(17, 21, 22, 27, 8);
    g.fillStyle(0xf0d6c0).fillCircle(27, 16, 11);
    g.lineStyle(4, 0xffffff, 0.9).strokeCircle(27, 34, 18);
  });

  makeTexture(scene, TextureKey.worker, 48, 60, (g) => {
    g.fillStyle(0x26313b, 0.25).fillEllipse(24, 51, 36, 12);
    g.fillStyle(0x1d5fa8).fillRoundedRect(12, 22, 24, 27, 7);
    g.fillStyle(0x2e8ae6).fillRoundedRect(15, 20, 18, 22, 6);
    g.fillStyle(0xf0d6c0).fillCircle(24, 14, 9);
  });

  makeTexture(scene, TextureKey.bear, 82, 58, (g) => {
    g.fillStyle(0x26313b, 0.2).fillEllipse(42, 47, 62, 14);
    g.fillStyle(0xbac7cd).fillEllipse(42, 31, 64, 30);
    g.fillStyle(0xf4f7f5).fillEllipse(36, 25, 58, 28);
    g.fillStyle(0xf4f7f5).fillCircle(17, 18, 10).fillCircle(60, 18, 10);
    g.fillStyle(0x2a3038).fillCircle(39, 25, 5);
  });

  makeTexture(scene, TextureKey.shelter, 280, 150, (g) => {
    g.fillStyle(0x26313b, 0.22).fillEllipse(140, 132, 250, 24);
    g.fillStyle(0x6b3e2b).fillRoundedRect(25, 58, 230, 68, 8);
    g.fillStyle(0x8f5f3e).fillRoundedRect(36, 45, 208, 70, 8);
    g.fillStyle(0xb97845).fillRect(50, 32, 180, 45);
    g.fillStyle(0xe0b070).fillRect(68, 20, 144, 22);
    g.lineStyle(4, 0xf4d69a, 0.85).strokeRoundedRect(36, 45, 208, 70, 8);
  });

  makeShop(scene, TextureKey.woodShop, 0xb97845);
  makeShop(scene, TextureKey.meatShop, 0xb94d5e);
  makeShop(scene, TextureKey.oreShop, 0x6c7b89);

  makeTexture(scene, TextureKey.wood, 28, 18, (g) => {
    g.fillStyle(0x6f3f22).fillRoundedRect(3, 6, 22, 9, 3);
    g.fillStyle(0x9d6033).fillRoundedRect(2, 3, 22, 9, 3);
    g.fillStyle(0xc4874c).fillRect(5, 5, 16, 2);
  });

  makeTexture(scene, TextureKey.meat, 28, 20, (g) => {
    g.fillStyle(0x8a2636).fillEllipse(14, 12, 22, 12);
    g.fillStyle(0xff6e7d).fillEllipse(14, 8, 22, 13);
    g.fillStyle(0xffc5cb).fillCircle(19, 7, 3);
  });

  makeTexture(scene, TextureKey.ore, 28, 24, (g) => {
    g.fillStyle(0x59636d).fillPoints([{ x: 4, y: 13 }, { x: 12, y: 3 }, { x: 24, y: 11 }, { x: 18, y: 22 }, { x: 5, y: 20 }], true);
    g.fillStyle(0x8b98a4).fillPoints([{ x: 5, y: 10 }, { x: 14, y: 3 }, { x: 23, y: 10 }, { x: 17, y: 18 }, { x: 6, y: 17 }], true);
    g.fillStyle(0xc8d4db).fillCircle(15, 9, 3);
  });

  makeTexture(scene, TextureKey.coin, 30, 20, (g) => {
    g.fillStyle(0x1b8c35).fillRoundedRect(4, 7, 22, 10, 3);
    g.fillStyle(0x53e768).fillRoundedRect(3, 3, 22, 11, 3);
    g.lineStyle(2, 0xffffff, 0.85).strokeRoundedRect(3, 3, 22, 11, 3);
  });

  makeTexture(scene, TextureKey.turret, 70, 70, (g) => {
    g.fillStyle(0x26313b, 0.25).fillEllipse(34, 58, 56, 14);
    g.fillStyle(0x6f4d33).fillRoundedRect(16, 38, 36, 15, 4);
    g.fillStyle(0x9c7f61).fillRoundedRect(22, 20, 25, 30, 5);
    g.fillStyle(0x2e3942).fillRect(42, 25, 24, 8);
    g.fillStyle(0xe0b070).fillRect(27, 14, 15, 10);
  });

  makeTexture(scene, TextureKey.customer, 34, 48, (g) => {
    g.fillStyle(0x26313b, 0.2).fillEllipse(17, 40, 28, 9);
    g.fillStyle(0x2488a8).fillRoundedRect(8, 18, 18, 21, 6);
    g.fillStyle(0xf0d6c0).fillCircle(17, 11, 8);
  });
}

function makeShop(scene: Phaser.Scene, key: string, color: number): void {
  makeTexture(scene, key, 108, 82, (g) => {
    g.fillStyle(0x26313b, 0.22).fillEllipse(54, 72, 88, 14);
    g.fillStyle(0x4c3023).fillRoundedRect(10, 34, 88, 34, 7);
    g.fillStyle(0x6a402d).fillRoundedRect(14, 26, 80, 35, 7);
    g.fillStyle(color).fillRect(7, 16, 94, 16);
    g.fillStyle(0xf4d69a).fillRect(18, 32, 68, 18);
    g.lineStyle(3, 0xf4d69a, 0.9).strokeRoundedRect(14, 26, 80, 35, 7);
  });
}

function makeTexture(scene: Phaser.Scene, key: string, width: number, height: number, draw: (graphics: Phaser.GameObjects.Graphics) => void): void {
  if (scene.textures.exists(key)) {
    return;
  }
  const graphics = scene.add.graphics();
  draw(graphics);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}
