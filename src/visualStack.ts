import type { Resource, ResourceBundle } from "./gameLogic";

const resourceOrder: Resource[] = ["wood", "meat", "ore", "coin"];
const columnX: Record<Resource, number> = {
  wood: -24,
  meat: -8,
  ore: 8,
  coin: 24
};

export type StackBlock = {
  resource: Resource;
  x: number;
  y: number;
  index: number;
  overflow: number;
};

export function buildStackBlocks({
  bundle,
  maxBlocksPerResource
}: {
  bundle: ResourceBundle;
  maxBlocksPerResource: number;
}): StackBlock[] {
  const blocks: StackBlock[] = [];

  for (const resource of resourceOrder) {
    const value = Math.max(0, Math.floor(bundle[resource]));
    const visible = Math.min(value, maxBlocksPerResource);
    const overflow = Math.max(0, value - maxBlocksPerResource);

    for (let i = 0; i < visible; i += 1) {
      blocks.push({
        resource,
        x: columnX[resource],
        y: -34 - i * 10,
        index: i,
        overflow: i === visible - 1 ? overflow : 0
      });
    }
  }

  return blocks;
}
