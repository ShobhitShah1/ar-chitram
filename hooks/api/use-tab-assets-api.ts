import { apiQueryKeys } from "@/services/api/query-keys";
import { useFocusEffect } from "expo-router";
import {
  CategorizedTabAssets,
  TabAssetCategory,
  TabAssetItem,
  fetchColorsTabAssets,
  fetchDrawingsTabAssets,
  fetchHomeTabAssets,
  fetchSketchesTabAssets,
} from "@/services/api/tab-assets-service";
import { useAuthStore } from "@/store/auth-store";
import {
  QueryClient,
  keepPreviousData,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { InteractionManager } from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useShuffleStore } from "@/store/shuffle-store";

const ASSETS_STALE_TIME = 15 * 60 * 1000;
const ASSETS_GC_TIME = 30 * 60 * 1000;
const ALL_FILTER_ID = "all";

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
  const shuffleSeed = useShuffleStore(
    (state) => (state.shuffleSeeds && state.shuffleSeeds.home) || 0,
  );
  const isShuffleActive = shuffleSeed > 0;

  const query = useQuery({
    queryKey: apiQueryKeys.assets.home,
    queryFn: fetchHomeTabAssets,
    enabled: isAuthenticated,
    ...getDefaultAssetsQueryOptions(),
  });

  const shuffledData = useMemo(() => {
    if (!query.data || !isShuffleActive) return query.data;
    return {
      ...query.data,
      homeGridItems: shuffleItemsSeeded(query.data.homeGridItems, shuffleSeed),
    };
  }, [query.data, isShuffleActive]);

  return { ...query, data: shuffledData };
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

import { shuffleItemsSeeded } from "@/utils/shuffle";

interface TabGridControllerResult {
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  gridItems: TabAssetItem[];
  shuffle: () => void;
}

export interface TabAssetSourceConfig {
  sourceId: string;
  label: string;
  queryKey: readonly unknown[];
  queryFn: () => Promise<CategorizedTabAssets>;
}

export interface PickerFilterOption {
  id: string;
  label: string;
  count: number;
}

export interface CreateFlowPickerAssetItem extends TabAssetItem {
  sourceId: string;
  sourceLabel: string;
  categoryId: string;
  categoryName: string;
}

const useTabGridController = (
  queryData: CategorizedTabAssets | undefined,
  screenId: string = "default",
): TabGridControllerResult => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const toggleShuffle = useShuffleStore((state) => state.toggleShuffle);
  const refreshShuffle = useShuffleStore((state) => state.refreshShuffle);
  const shuffleSeed = useShuffleStore(
    (state) => (state.shuffleSeeds && state.shuffleSeeds[screenId]) || 0,
  );

  const handleToggleShuffle = useCallback(
    () => toggleShuffle(screenId),
    [toggleShuffle, screenId],
  );

  useFocusEffect(
    useCallback(() => {
      refreshShuffle(screenId);
    }, [refreshShuffle, screenId]),
  );

  const categories = useMemo(() => {
    const apiCategories =
      queryData?.categories.map((category) => category.name) ?? [];
    return ["All", ...apiCategories];
  }, [queryData]);

  const rawItems = useMemo(() => {
    if (!queryData) {
      return [];
    }

    if (selectedCategory === "All") {
      return queryData.flatAssets;
    }

    return (
      queryData.categories.find(
        (category) => category.name === selectedCategory,
      )?.assets ?? []
    );
  }, [queryData, selectedCategory]);

  useEffect(() => {
    if (!categories.includes(selectedCategory)) {
      setSelectedCategory("All");
    }
  }, [categories, selectedCategory]);

  const displayItems = useMemo(() => {
    if (selectedCategory !== "All") {
      return rawItems;
    }
    return shuffleItemsSeeded(rawItems, shuffleSeed);
  }, [rawItems, shuffleSeed, selectedCategory]);

  const handleSetSelectedCategory = useCallback(
    (category: string) => {
      if (category === "All") {
        refreshShuffle(screenId);
      }
      setSelectedCategory(category);
    },
    [refreshShuffle, screenId],
  );

  return {
    categories,
    selectedCategory,
    setSelectedCategory: handleSetSelectedCategory,
    gridItems: displayItems,
    shuffle: handleToggleShuffle,
  };
};

const prefixAssets = (
  assets: readonly TabAssetItem[],
  prefix: string,
): TabAssetItem[] =>
  assets.map((asset) => ({
    ...asset,
    id: `${prefix}-${asset.id}`,
  }));

const mergeTabAssetSources = (
  sources: Array<{ prefix: string; data?: CategorizedTabAssets }>,
): CategorizedTabAssets | undefined => {
  const categoryMap = new Map<string, TabAssetCategory>();
  const flatAssets: TabAssetItem[] = [];

  for (const source of sources) {
    if (!source.data) {
      continue;
    }

    flatAssets.push(...prefixAssets(source.data.flatAssets, source.prefix));

    for (const category of source.data.categories) {
      const categoryName = category.name?.trim() || "Uncategorized";
      const nextAssets = prefixAssets(category.assets, source.prefix);
      const existingCategory = categoryMap.get(categoryName);

      if (existingCategory) {
        existingCategory.assets.push(...nextAssets);
        continue;
      }

      categoryMap.set(categoryName, {
        id: `${source.prefix}-${category.id}`,
        name: categoryName,
        assets: nextAssets,
      });
    }
  }

  if (flatAssets.length === 0 && categoryMap.size === 0) {
    return undefined;
  }

  return {
    categories: Array.from(categoryMap.values()),
    flatAssets,
  };
};

const buildPickerAssets = (
  sourceConfigs: readonly TabAssetSourceConfig[],
  sourceQueries: readonly { data?: CategorizedTabAssets }[],
): CreateFlowPickerAssetItem[] => {
  const items: CreateFlowPickerAssetItem[] = [];

  sourceConfigs.forEach((source, index) => {
    const data = sourceQueries[index]?.data as CategorizedTabAssets | undefined;
    if (!data) {
      return;
    }

    data.categories.forEach((category, categoryIndex) => {
      const categoryName =
        category.name?.trim() || `Category ${categoryIndex + 1}`;
      const categoryId = `${source.sourceId}-${category.id}`;

      category.assets.forEach((asset) => {
        items.push({
          ...asset,
          id: `${source.sourceId}-${asset.id}`,
          sourceId: source.sourceId,
          sourceLabel: source.label,
          categoryId,
          categoryName,
        });
      });
    });
  });

  return items;
};

const getCategoryFilterId = (
  asset: Pick<CreateFlowPickerAssetItem, "categoryId" | "categoryName">,
  selectedSourceId: string,
) =>
  selectedSourceId === ALL_FILTER_ID
    ? `all-category:${asset.categoryName}`
    : asset.categoryId;

// Add new asset servers here for create/upload picker flows.
export const CREATE_FLOW_ASSET_SOURCES: readonly TabAssetSourceConfig[] = [
  {
    sourceId: "drawing",
    label: "Draw",
    queryKey: apiQueryKeys.assets.drawings,
    queryFn: fetchDrawingsTabAssets,
  },
  {
    sourceId: "sketch",
    label: "Sketch",
    queryKey: apiQueryKeys.assets.sketches,
    queryFn: fetchSketchesTabAssets,
  },
  {
    sourceId: "color",
    label: "Color",
    queryKey: apiQueryKeys.assets.colors,
    queryFn: fetchColorsTabAssets,
  },
];

const useMergedTabAssetsGrid = (
  sourceConfigs: readonly TabAssetSourceConfig[],
) => {
  const isAuthenticated = useHasAuthSession();

  const sourceQueries = useQueries({
    queries: sourceConfigs.map((source) => ({
      queryKey: source.queryKey,
      queryFn: source.queryFn,
      enabled: isAuthenticated,
      ...getDefaultAssetsQueryOptions(),
    })),
  });

  const mergedData = useMemo(
    () =>
      mergeTabAssetSources(
        sourceConfigs.map((source, index) => ({
          prefix: source.sourceId,
          data: sourceQueries[index]?.data as CategorizedTabAssets | undefined,
        })),
      ),
    [sourceConfigs, sourceQueries],
  );

  const gridController = useTabGridController(mergedData, "create");
  const hasResolvedData = sourceQueries.some(
    (query) => query.data !== undefined,
  );

  const refetch = useCallback(async () => {
    await Promise.allSettled(sourceQueries.map((query) => query.refetch()));
  }, [sourceQueries]);

  const isLoading =
    sourceQueries.some((query) => query.isLoading) && !hasResolvedData;
  const isFetching = sourceQueries.some((query) => query.isFetching);
  const isError =
    sourceQueries.every((query) => query.isError) && !hasResolvedData;
  const error = sourceQueries.find((query) => query.error)?.error ?? null;

  return {
    ...gridController,
    data: mergedData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  };
};

const useCreateFlowAssetPickerController = (
  sourceConfigs: readonly TabAssetSourceConfig[],
  screenId: string = "modal",
) => {
  const isAuthenticated = useHasAuthSession();
  const [selectedSourceId, setSelectedSourceId] = useState(ALL_FILTER_ID);
  const [selectedCategoryId, setSelectedCategoryId] = useState(ALL_FILTER_ID);
  const toggleShuffle = useShuffleStore((state) => state.toggleShuffle);
  const shuffleSeed = useShuffleStore(
    (state) => (state.shuffleSeeds && state.shuffleSeeds[screenId]) || 0,
  );
  const isShuffleActive = shuffleSeed > 0;

  const handleToggleShuffle = useCallback(
    () => toggleShuffle(screenId),
    [toggleShuffle, screenId],
  );

  const refreshShuffle = useShuffleStore((state) => state.refreshShuffle);

  const handleSetSelectedSourceId = useCallback(
    (sourceId: string) => {
      if (sourceId === ALL_FILTER_ID) {
        refreshShuffle(screenId);
      }
      setSelectedSourceId(sourceId);
    },
    [refreshShuffle, screenId],
  );

  const handleSetSelectedCategoryId = useCallback(
    (categoryId: string) => {
      if (categoryId === ALL_FILTER_ID) {
        refreshShuffle(screenId);
      }
      setSelectedCategoryId(categoryId);
    },
    [refreshShuffle, screenId],
  );

  const sourceQueries = useQueries({
    queries: sourceConfigs.map((source) => ({
      queryKey: source.queryKey,
      queryFn: source.queryFn,
      enabled: isAuthenticated,
      ...getDefaultAssetsQueryOptions(),
    })),
  });

  const allAssets = useMemo(
    () => buildPickerAssets(sourceConfigs, sourceQueries),
    [sourceConfigs, sourceQueries],
  );

  const sourceOptions = useMemo<PickerFilterOption[]>(() => {
    const nextOptions: PickerFilterOption[] = [
      {
        id: ALL_FILTER_ID,
        label: "All",
        count: allAssets.length,
      },
    ];

    for (const source of sourceConfigs) {
      nextOptions.push({
        id: source.sourceId,
        label: source.label,
        count: allAssets.filter((asset) => asset.sourceId === source.sourceId)
          .length,
      });
    }

    return nextOptions;
  }, [allAssets, sourceConfigs]);

  const sourceScopedAssets = useMemo(() => {
    if (selectedSourceId === ALL_FILTER_ID) {
      return allAssets;
    }

    return allAssets.filter((asset) => asset.sourceId === selectedSourceId);
  }, [allAssets, selectedSourceId]);

  const categoryOptions = useMemo<PickerFilterOption[]>(() => {
    const categoryMap = new Map<string, PickerFilterOption>();

    for (const asset of sourceScopedAssets) {
      const categoryFilterId = getCategoryFilterId(asset, selectedSourceId);
      const existing = categoryMap.get(categoryFilterId);

      if (existing) {
        existing.count += 1;
        continue;
      }

      categoryMap.set(categoryFilterId, {
        id: categoryFilterId,
        label: asset.categoryName,
        count: 1,
      });
    }

    return [
      {
        id: ALL_FILTER_ID,
        label: "All",
        count: sourceScopedAssets.length,
      },
      ...Array.from(categoryMap.values()).sort((left, right) =>
        left.label.localeCompare(right.label),
      ),
    ];
  }, [selectedSourceId, sourceScopedAssets]);

  const filteredAssets = useMemo(() => {
    if (selectedCategoryId === ALL_FILTER_ID) {
      return sourceScopedAssets;
    }

    return sourceScopedAssets.filter(
      (asset) =>
        getCategoryFilterId(asset, selectedSourceId) === selectedCategoryId,
    );
  }, [selectedCategoryId, selectedSourceId, sourceScopedAssets]);

  useEffect(() => {
    if (!sourceOptions.some((option) => option.id === selectedSourceId)) {
      setSelectedSourceId(ALL_FILTER_ID);
    }
  }, [selectedSourceId, sourceOptions]);

  useEffect(() => {
    if (!categoryOptions.some((option) => option.id === selectedCategoryId)) {
      setSelectedCategoryId(ALL_FILTER_ID);
    }
  }, [categoryOptions, selectedCategoryId]);

  const displayAssets = useMemo(() => {
    if (
      selectedSourceId !== ALL_FILTER_ID ||
      selectedCategoryId !== ALL_FILTER_ID
    ) {
      return filteredAssets;
    }
    return shuffleItemsSeeded(filteredAssets, shuffleSeed);
  }, [filteredAssets, shuffleSeed, selectedSourceId, selectedCategoryId]);

  const refetch = useCallback(async () => {
    await Promise.allSettled(sourceQueries.map((query) => query.refetch()));
  }, [sourceQueries]);

  const hasResolvedData = sourceQueries.some(
    (query) => query.data !== undefined,
  );
  const isLoading =
    sourceQueries.some((query) => query.isLoading) && !hasResolvedData;
  const isFetching = sourceQueries.some((query) => query.isFetching);
  const isError =
    sourceQueries.every((query) => query.isError) && !hasResolvedData;
  const error = sourceQueries.find((query) => query.error)?.error ?? null;

  return {
    assets: displayAssets,
    allAssets,
    sourceOptions,
    selectedSourceId,
    setSelectedSourceId: handleSetSelectedSourceId,
    categoryOptions,
    selectedCategoryId,
    setSelectedCategoryId: handleSetSelectedCategoryId,
    shuffle: handleToggleShuffle,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  };
};

export const useColorsTabGrid = () => {
  const query = useColorsTabAssets();
  return {
    ...query,
    ...useTabGridController(query.data, "colors"),
  };
};

export const useDrawingsTabGrid = () => {
  const query = useDrawingsTabAssets();
  return {
    ...query,
    ...useTabGridController(query.data, "drawings"),
  };
};

export const useCreateFlowTabAssetsGrid = () =>
  useMergedTabAssetsGrid(CREATE_FLOW_ASSET_SOURCES);

export const useCreateFlowAssetPicker = () =>
  useCreateFlowAssetPickerController(CREATE_FLOW_ASSET_SOURCES, "modal");

export const useColorsAndDrawingsTabGrid = () => useCreateFlowTabAssetsGrid();

export const useSketchesTabGrid = () => {
  const query = useSketchesTabAssets();
  return {
    ...query,
    ...useTabGridController(query.data, "sketches"),
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
