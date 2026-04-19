import { storage } from "@/utils/storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface ShuffleState {
  shuffleSeeds: Record<string, number>;
  toggleShuffle: (screenId: string) => void;
  refreshShuffle: (screenId: string) => void;
}

const SYNCED_SCREEN_IDS = [
  "colors",
  "sketches",
  "drawings",
  "home",
  "create",
  "modal",
];

const zustandMMKVStorage = {
  setItem: (name: string, value: string) => storage.setString(name, value),
  getItem: (name: string) => storage.getString(name) ?? null,
  removeItem: (name: string) => storage.removeItem(name),
};

const generateSeed = () => Math.floor(Math.random() * 1_000_000) + 1;

const applySync = (
  seeds: Record<string, number>,
  screenId: string,
  nextSeed: number,
): Record<string, number> => {
  const updated = { ...seeds, [screenId]: nextSeed };
  if (SYNCED_SCREEN_IDS.includes(screenId)) {
    for (const id of SYNCED_SCREEN_IDS) {
      updated[id] = nextSeed;
    }
  }
  return updated;
};

export const useShuffleStore = create<ShuffleState>()(
  persist(
    (set) => ({
      shuffleSeeds: {},
      toggleShuffle: (screenId) =>
        set((state) => {
          const current = state.shuffleSeeds[screenId] || 0;
          const nextSeed = current > 0 ? 0 : generateSeed();
          return {
            shuffleSeeds: applySync(state.shuffleSeeds, screenId, nextSeed),
          };
        }),
      refreshShuffle: (screenId) =>
        set((state) => {
          if ((state.shuffleSeeds[screenId] || 0) === 0) return state;
          return {
            shuffleSeeds: applySync(
              state.shuffleSeeds,
              screenId,
              generateSeed(),
            ),
          };
        }),
    }),
    {
      name: "@app-shuffle-settings-v3",
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);
