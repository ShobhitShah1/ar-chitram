export const shuffleItemsSeeded = <T>(
  items: readonly T[],
  seedValue: number,
): T[] => {
  if (seedValue === 0) return [...items];

  const cloned = [...items];
  let seed = seedValue;

  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = cloned.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }

  return cloned;
};
