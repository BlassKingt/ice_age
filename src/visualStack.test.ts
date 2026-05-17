import { describe, expect, it } from "vitest";
import { buildStackBlocks } from "./visualStack";

describe("visual resource stacks", () => {
  it("lays out visible blocks with a cap and overflow count", () => {
    const blocks = buildStackBlocks({
      bundle: { wood: 18, meat: 3, ore: 0, coin: 9 },
      maxBlocksPerResource: 6
    });

    expect(blocks.filter((block) => block.resource === "wood")).toHaveLength(6);
    expect(blocks.filter((block) => block.resource === "coin")).toHaveLength(6);
    expect(blocks.filter((block) => block.resource === "meat")).toHaveLength(3);
    expect(blocks.some((block) => block.resource === "ore")).toBe(false);
    expect(blocks.find((block) => block.resource === "wood" && block.overflow === 12)).toBeDefined();
    expect(blocks.find((block) => block.resource === "coin" && block.overflow === 3)).toBeDefined();
  });

  it("keeps resources in separate compact columns behind the player", () => {
    const blocks = buildStackBlocks({
      bundle: { wood: 2, meat: 2, ore: 2, coin: 2 },
      maxBlocksPerResource: 6
    });

    expect(blocks.map((block) => [block.resource, block.x, block.y])).toEqual([
      ["wood", -24, -34],
      ["wood", -24, -44],
      ["meat", -8, -34],
      ["meat", -8, -44],
      ["ore", 8, -34],
      ["ore", 8, -44],
      ["coin", 24, -34],
      ["coin", 24, -44]
    ]);
  });

  it("资源堆叠可以超过竖屏顶部后再压缩", () => {
    const blocks = buildStackBlocks({
      bundle: { wood: 140, meat: 0, ore: 0, coin: 0 },
      maxBlocksPerResource: 110
    });

    expect(blocks.filter((block) => block.resource === "wood")).toHaveLength(110);
    expect(Math.min(...blocks.map((block) => block.y))).toBeLessThan(-960);
    expect(blocks.at(-1)?.overflow).toBe(30);
  });
});
