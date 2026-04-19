export const shuffleItemsSeeded = <T>(
  items: readonly T[],
  seedValue: number,
): T[] => {
  if (seedValue === 0) return [...items];
  const cloned = [...items];

  // Simple stateful PRNG (Mulberry32-like) for good distribution
  let currentSeed = seedValue;
  const random = () => {
    currentSeed |= 0;
    currentSeed = (currentSeed + 0x6d2b79f5) | 0;
    let t = Math.imul(currentSeed ^ (currentSeed >>> 15), 1 | currentSeed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let idx = cloned.length - 1; idx > 0; idx -= 1) {
    const randomIndex = Math.floor(random() * (idx + 1));
    [cloned[idx], cloned[randomIndex]] = [cloned[randomIndex], cloned[idx]];
  }
  return cloned;
};
