export const shuffleItemsSeeded = <T>(items: readonly T[], seedValue: number): T[] => {
  if (seedValue === 0) return [...items];
  const cloned = [...items];
  
  // Use the seedValue to make the shuffle unique per click
  for (let idx = cloned.length - 1; idx > 0; idx -= 1) {
    const seed = (idx * 9301 + 49297 + seedValue) % 233280;
    const randomIndex = Math.floor((seed / 233280.0) * (idx + 1));
    [cloned[idx], cloned[randomIndex]] = [cloned[randomIndex], cloned[idx]];
  }
  return cloned;
};
