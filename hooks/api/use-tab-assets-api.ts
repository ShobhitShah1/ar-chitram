import { apiQueryKeys } from "@/services/api/query-keys";
import {
  CategorizedTabAssets,
  TabAssetItem,
  fetchColorsTabAssets,
  fetchDrawingsTabAssets,
  fetchHomeTabAssets,
  fetchSketchesTabAssets,
} from "@/services/api/tab-assets-service";
import { useAuthStore } from "@/store/auth-store";
import { QueryClient, keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { InteractionManager } from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";

const ASSETS_STALE_TIME = 15 * 60 * 1000;
const ASSETS_GC_TIME = 30 * 60 * 1000;

const getDefaultAssetsQueryOptions = () => ({
  staleTime: ASSETS_STALE_TIME,
  gcTime: ASSETS_GC_TIME,
  retry: 1,
  placeholderData: keepPreviousData,
});

const useHasAuthSession = () =>
  useAuthStore((state) => Boolean(state.accessToken && state.user?.id));

export const useHomeTabAssets = () => {
  const isAuthenticated = useHasAuthSession();

  return useQuery({
    queryKey: apiQueryKeys.assets.home,
    queryFn: fetchHomeTabAssets,
    enabled: isAuthenticated,
    ...getDefaultAssetsQueryOptions(),
  });
};

export const useColorsTabAssets = () => {
  const isAuthenticated = useHasAuthSession();

  return useQuery({
    queryKey: apiQueryKeys.assets.colors,
    queryFn: fetchColorsTabAssets,
    enabled: isAuthenticated,
    ...getDefaultAssetsQueryOptions(),
  });
};

export const useDrawingsTabAssets = () => {
  const isAuthenticated = useHasAuthSession();

  return useQuery({
    queryKey: apiQueryKeys.assets.drawings,
    queryFn: fetchDrawingsTabAssets,
    enabled: isAuthenticated,
    ...getDefaultAssetsQueryOptions(),
  });
};

export const useSketchesTabAssets = () => {
  const isAuthenticated = useHasAuthSession();

  return useQuery({
    queryKey: apiQueryKeys.assets.sketches,
    queryFn: fetchSketchesTabAssets,
    enabled: isAuthenticated,
    ...getDefaultAssetsQueryOptions(),
  });
};

const shuffleItems = <T,>(items: readonly T[]): T[] => {
  const cloned = [...items];
  for (let idx = cloned.length - 1; idx > 0; idx -= 1) {
    const randomIndex = Math.floor(Math.random() * (idx + 1));
    [cloned[idx], cloned[randomIndex]] = [cloned[randomIndex], cloned[idx]];
  }
  return cloned;
};

interface TabGridControllerResult {
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  gridItems: TabAssetItem[];
  shuffle: () => void;
}

const useTabGridController = (
  queryData: CategorizedTabAssets | undefined,
): TabGridControllerResult => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [shuffledItems, setShuffledItems] = useState<TabAssetItem[] | null>(null);

  const categories = useMemo(() => {
    const apiCategories = queryData?.categories.map((category) => category.name) ?? [];
    return ["All", ...apiCategories];
  }, [queryData]);

  const rawItems = useMemo(() => {
    if (!queryData) {
      return [];
    }

    if (selectedCategory === "All") {
      return queryData.flatAssets;
    }

    return queryData.categories.find((category) => category.name === selectedCategory)?.assets ?? [];
  }, [queryData, selectedCategory]);

  useEffect(() => {
    if (!categories.includes(selectedCategory)) {
      setSelectedCategory("All");
    }
  }, [categories, selectedCategory]);

  useEffect(() => {
    setShuffledItems(null);
  }, [selectedCategory, queryData]);

  const shuffle = useCallback(() => {
    setShuffledItems(shuffleItems(rawItems));
  }, [rawItems]);

  return {
    categories,
    selectedCategory,
    setSelectedCategory,
    gridItems: shuffledItems ?? rawItems,
    shuffle,
  };
};

export const useColorsTabGrid = () => {
  const query = useColorsTabAssets();
  return {
    ...query,
    ...useTabGridController(query.data),
  };
};

export const useDrawingsTabGrid = () => {
  const query = useDrawingsTabAssets();
  return {
    ...query,
    ...useTabGridController(query.data),
  };
};

export const useSketchesTabGrid = () => {
  const query = useSketchesTabAssets();
  return {
    ...query,
    ...useTabGridController(query.data),
  };
};

export const prefetchCoreTabAssets = async (
  queryClient: QueryClient,
): Promise<void> => {
  await Promise.allSettled([
    queryClient.ensureQueryData({
      queryKey: apiQueryKeys.assets.home,
      queryFn: fetchHomeTabAssets,
      ...getDefaultAssetsQueryOptions(),
    }),
    queryClient.ensureQueryData({
      queryKey: apiQueryKeys.assets.colors,
      queryFn: fetchColorsTabAssets,
      ...getDefaultAssetsQueryOptions(),
    }),
    queryClient.ensureQueryData({
      queryKey: apiQueryKeys.assets.drawings,
      queryFn: fetchDrawingsTabAssets,
      ...getDefaultAssetsQueryOptions(),
    }),
    queryClient.ensureQueryData({
      queryKey: apiQueryKeys.assets.sketches,
      queryFn: fetchSketchesTabAssets,
      ...getDefaultAssetsQueryOptions(),
    }),
  ]);
};

const withTimeout = async (promise: Promise<void>, timeoutMs: number) => {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  try {
    await Promise.race([
      promise,
      new Promise<void>((resolve) => {
        timeoutHandle = setTimeout(resolve, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

export const useWarmCoreTabAssets = () => {
  const queryClient = useQueryClient();

  return useCallback(
    async (options?: { timeoutMs?: number }) => {
      const { accessToken, user } = useAuthStore.getState();
      if (!accessToken || !user?.id) {
        return;
      }

      const warmupPromise = prefetchCoreTabAssets(queryClient);

      if (options?.timeoutMs && options.timeoutMs > 0) {
        await withTimeout(warmupPromise, options.timeoutMs);
        return;
      }

      await warmupPromise;
    },
    [queryClient],
  );
};

export const useScheduleCoreTabAssetsPrefetch = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    const { accessToken, user } = useAuthStore.getState();
    if (!accessToken || !user?.id) {
      return;
    }

    InteractionManager.runAfterInteractions(() => {
      void prefetchCoreTabAssets(queryClient);
    });
  }, [queryClient]);
};
