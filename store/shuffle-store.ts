import { storage } from "@/utils/storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface ShuffleState {
  shuffleSeeds: Record<string, number>; // 0 means inactive, > 0 is the seed version
  toggleShuffle: (screenId: string) => void;
  refreshShuffle: (screenId: string) => void;
}

const zustandMMKVStorage = {
  setItem: (name: string, value: string) => {
    storage.setString(name, value);
  },
  getItem: (name: string) => storage.getString(name) ?? null,
  removeItem: (name: string) => {
    storage.removeItem(name);
  },
};

export const useShuffleStore = create<ShuffleState>()(
  persist(
    (set) => ({
      shuffleSeeds: {},
      toggleShuffle: (screenId: string) =>
        set((state) => {
          const currentSeed = state.shuffleSeeds[screenId] || 0;
          return {
            shuffleSeeds: {
              ...state.shuffleSeeds,
              [screenId]:
                currentSeed === 0 ? Math.floor(Math.random() * 1000000) + 1 : 0,
            },
          };
        }),
      refreshShuffle: (screenId: string) =>
        set((state) => {
          const currentSeed = state.shuffleSeeds[screenId] || 0;
          if (currentSeed === 0) {
            return state;
          }

          return {
            shuffleSeeds: {
              ...state.shuffleSeeds,
              [screenId]: Math.floor(Math.random() * 1000000) + 1,
            },
          };
        }),
    }),
    {
      name: "@app-shuffle-settings-v3",
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);
