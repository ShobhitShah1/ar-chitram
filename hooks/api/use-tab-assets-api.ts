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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShuffleStore } from "@/store/shuffle-store";
import { shuffleItemsSeeded } from "@/utils/shuffle";

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

const generateSeed = () => Math.floor(Math.random() * 1_000_000) + 1;

const computeActiveSeed = (
  isAll: boolean,
  shuffleSeed: number,
  localAllSeed: number,
) => (shuffleSeed > 0 ? shuffleSeed : isAll ? localAllSeed : 0);

const deriveQueryStatus = (
  queries: Array<{
    data?: unknown;
    isLoading: boolean;
    isFetching: boolean;
    isError: boolean;
    error?: unknown;
  }>,
) => {
  const hasResolvedData = queries.some((q) => q.data !== undefined);
  return {
    hasResolvedData,
    isLoading: queries.some((q) => q.isLoading) && !hasResolvedData,
    isFetching: queries.some((q) => q.isFetching),
    isError: queries.every((q) => q.isError) && !hasResolvedData,
    error: queries.find((q) => q.error)?.error ?? null,
  };
};

export const useHomeTabAssets = () => {
  const isAuthenticated = useHasAuthSession();
  const [localAllSeed] = useState(generateSeed);
  const shuffleSeed = useShuffleStore(
    (state) => (state.shuffleSeeds && state.shuffleSeeds.home) || 0,
  );

  const query = useQuery({
    queryKey: apiQueryKeys.assets.home,
    queryFn: fetchHomeTabAssets,
    enabled: isAuthenticated,
    ...getDefaultAssetsQueryOptions(),
  });

  const shuffledData = useMemo(() => {
    if (!query.data) return undefined;
    const activeSeed = shuffleSeed > 0 ? shuffleSeed : localAllSeed;
    
    return {
      ...query.data,
      homeGridItems: shuffleItemsSeeded(query.data.homeGridItems ?? [], activeSeed),
    };
  }, [query.data, shuffleSeed, localAllSeed]);

  return { ...query, data: shuffledData ?? query.data };
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
  const [localAllSeed, setLocalAllSeed] = useState(generateSeed);
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
      setLocalAllSeed(generateSeed());
    }, [refreshShuffle, screenId]),
  );

  const categories = useMemo(() => {
    const apiCategories = queryData?.categories.map((c) => c.name) ?? [];
    return ["All", ...apiCategories];
  }, [queryData]);

  useEffect(() => {
    if (!categories.includes(selectedCategory)) {
      setSelectedCategory("All");
    }
  }, [categories, selectedCategory]);

  const displayItems = useMemo(() => {
    if (!queryData) return [];

    const rawItems =
      selectedCategory === "All"
        ? queryData.flatAssets
        : (queryData.categories.find((c) => c.name === selectedCategory)
            ?.assets ?? []);

    const activeSeed = computeActiveSeed(
      selectedCategory === "All",
      shuffleSeed,
      localAllSeed,
    );

    if (activeSeed === 0) return rawItems;
    return shuffleItemsSeeded(rawItems, activeSeed);
  }, [queryData, shuffleSeed, localAllSeed, selectedCategory]);

  const handleSetSelectedCategory = useCallback(
    (category: string) => {
      if (shuffleSeed > 0) refreshShuffle(screenId);
      if (category === "All") setLocalAllSeed(generateSeed());
      setSelectedCategory(category);
    },
    [refreshShuffle, screenId, shuffleSeed],
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
  assets.map((asset) => ({ ...asset, id: `${prefix}-${asset.id}` }));

const mergeTabAssetSources = (
  sources: Array<{ prefix: string; data?: CategorizedTabAssets }>,
): CategorizedTabAssets | undefined => {
  const categoryMap = new Map<string, TabAssetCategory>();
  const flatAssets: TabAssetItem[] = [];

  for (const source of sources) {
    if (!source.data) continue;

    flatAssets.push(...prefixAssets(source.data.flatAssets, source.prefix));

    for (const category of source.data.categories) {
      const categoryName = category.name?.trim() || "Uncategorized";
      const nextAssets = prefixAssets(category.assets, source.prefix);
      const existing = categoryMap.get(categoryName);

      if (existing) {
        existing.assets.push(...nextAssets);
        continue;
      }

      categoryMap.set(categoryName, {
        id: `${source.prefix}-${category.id}`,
        name: categoryName,
        assets: nextAssets,
      });
    }
  }

  if (flatAssets.length === 0 && categoryMap.size === 0) return undefined;

  return { categories: Array.from(categoryMap.values()), flatAssets };
};

const buildPickerAssets = (
  sourceConfigs: readonly TabAssetSourceConfig[],
  sourceQueries: readonly { data?: CategorizedTabAssets }[],
): CreateFlowPickerAssetItem[] => {
  const items: CreateFlowPickerAssetItem[] = [];

  for (const [index, source] of sourceConfigs.entries()) {
    const data = sourceQueries[index]?.data;
    if (!data) continue;

    for (const [categoryIndex, category] of data.categories.entries()) {
      const categoryName =
        category.name?.trim() || `Category ${categoryIndex + 1}`;
      const categoryId = `${source.sourceId}-${category.id}`;

      for (const asset of category.assets) {
        items.push({
          ...asset,
          id: `${source.sourceId}-${asset.id}`,
          sourceId: source.sourceId,
          sourceLabel: source.label,
          categoryId,
          categoryName,
        });
      }
    }
  }

  return items;
};

const getCategoryFilterId = (
  asset: Pick<CreateFlowPickerAssetItem, "categoryId" | "categoryName">,
  selectedSourceId: string,
) =>
  selectedSourceId === ALL_FILTER_ID
    ? `all-category:${asset.categoryName}`
    : asset.categoryId;

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
  const status = deriveQueryStatus(sourceQueries);

  const refetch = useCallback(async () => {
    await Promise.allSettled(sourceQueries.map((q) => q.refetch()));
  }, [sourceQueries]);

  return {
    ...gridController,
    data: mergedData,
    isLoading: status.isLoading,
    isFetching: status.isFetching,
    isError: status.isError,
    error: status.error,
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
  const [localAllSeed, setLocalAllSeed] = useState(generateSeed);
  const toggleShuffle = useShuffleStore((state) => state.toggleShuffle);
  const refreshShuffle = useShuffleStore((state) => state.refreshShuffle);
  const shuffleSeed = useShuffleStore(
    (state) => (state.shuffleSeeds && state.shuffleSeeds[screenId]) || 0,
  );

  const handleToggleShuffle = useCallback(
    () => toggleShuffle(screenId),
    [toggleShuffle, screenId],
  );

  const handleSetSelectedSourceId = useCallback(
    (sourceId: string) => {
      if (shuffleSeed > 0) refreshShuffle(screenId);
      if (sourceId === ALL_FILTER_ID) setLocalAllSeed(generateSeed());
      setSelectedSourceId(sourceId);
    },
    [refreshShuffle, screenId, shuffleSeed],
  );

  const handleSetSelectedCategoryId = useCallback(
    (categoryId: string) => {
      if (shuffleSeed > 0) refreshShuffle(screenId);
      if (categoryId === ALL_FILTER_ID) setLocalAllSeed(generateSeed());
      setSelectedCategoryId(categoryId);
    },
    [refreshShuffle, screenId, shuffleSeed],
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
    const options: PickerFilterOption[] = [
      { id: ALL_FILTER_ID, label: "All", count: allAssets.length },
    ];
    for (const source of sourceConfigs) {
      options.push({
        id: source.sourceId,
        label: source.label,
        count: allAssets.filter((a) => a.sourceId === source.sourceId).length,
      });
    }
    return options;
  }, [allAssets, sourceConfigs]);

  const sourceScopedAssets = useMemo(
    () =>
      selectedSourceId === ALL_FILTER_ID
        ? allAssets
        : allAssets.filter((a) => a.sourceId === selectedSourceId),
    [allAssets, selectedSourceId],
  );

  const categoryOptions = useMemo<PickerFilterOption[]>(() => {
    const categoryMap = new Map<string, PickerFilterOption>();

    for (const asset of sourceScopedAssets) {
      const filterId = getCategoryFilterId(asset, selectedSourceId);
      const existing = categoryMap.get(filterId);
      if (existing) {
        existing.count += 1;
        continue;
      }
      categoryMap.set(filterId, {
        id: filterId,
        label: asset.categoryName,
        count: 1,
      });
    }

    return [
      { id: ALL_FILTER_ID, label: "All", count: sourceScopedAssets.length },
      ...Array.from(categoryMap.values()).sort((a, b) =>
        a.label.localeCompare(b.label),
      ),
    ];
  }, [selectedSourceId, sourceScopedAssets]);

  const filteredAssets = useMemo(
    () =>
      selectedCategoryId === ALL_FILTER_ID
        ? sourceScopedAssets
        : sourceScopedAssets.filter(
            (a) =>
              getCategoryFilterId(a, selectedSourceId) === selectedCategoryId,
          ),
    [selectedCategoryId, selectedSourceId, sourceScopedAssets],
  );

  useEffect(() => {
    if (!sourceOptions.some((o) => o.id === selectedSourceId)) {
      setSelectedSourceId(ALL_FILTER_ID);
    }
  }, [selectedSourceId, sourceOptions]);

  useEffect(() => {
    if (!categoryOptions.some((o) => o.id === selectedCategoryId)) {
      setSelectedCategoryId(ALL_FILTER_ID);
    }
  }, [categoryOptions, selectedCategoryId]);

  const displayAssets = useMemo(() => {
    const rawItems =
      selectedCategoryId === ALL_FILTER_ID
        ? sourceScopedAssets
        : sourceScopedAssets.filter(
            (asset) =>
              getCategoryFilterId(asset, selectedSourceId) ===
              selectedCategoryId,
          );

    const activeSeed = computeActiveSeed(
      selectedCategoryId === ALL_FILTER_ID,
      shuffleSeed,
      localAllSeed,
    );

    if (activeSeed === 0) return rawItems;
    return shuffleItemsSeeded(rawItems, activeSeed);
  }, [
    sourceScopedAssets,
    shuffleSeed,
    localAllSeed,
    selectedCategoryId,
    selectedSourceId,
  ]);


  const status = deriveQueryStatus(sourceQueries);

  const refetch = useCallback(async () => {
    await Promise.allSettled(sourceQueries.map((q) => q.refetch()));
  }, [sourceQueries]);

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
    isLoading: status.isLoading,
    isFetching: status.isFetching,
    isError: status.isError,
    error: status.error,
    refetch,
  };
};

export const useColorsTabGrid = () => {
  const query = useColorsTabAssets();
  return { ...query, ...useTabGridController(query.data, "colors") };
};

export const useDrawingsTabGrid = () => {
  const query = useDrawingsTabAssets();
  return { ...query, ...useTabGridController(query.data, "drawings") };
};

export const useCreateFlowTabAssetsGrid = () =>
  useMergedTabAssetsGrid(CREATE_FLOW_ASSET_SOURCES);

export const useCreateFlowAssetPicker = () =>
  useCreateFlowAssetPickerController(CREATE_FLOW_ASSET_SOURCES, "modal");

export const useColorsAndDrawingsTabGrid = () => useCreateFlowTabAssetsGrid();

export const useSketchesTabGrid = () => {
  const query = useSketchesTabAssets();
  return { ...query, ...useTabGridController(query.data, "sketches") };
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

const withTimeout = async (
  promise: Promise<void>,
  timeoutMs: number,
): Promise<void> => {
  let handle: ReturnType<typeof setTimeout> | null = null;
  try {
    await Promise.race([
      promise,
      new Promise<void>((resolve) => {
        handle = setTimeout(resolve, timeoutMs);
      }),
    ]);
  } finally {
    if (handle) clearTimeout(handle);
  }
};

export const useWarmCoreTabAssets = () => {
  const queryClient = useQueryClient();

  return useCallback(
    async (options?: { timeoutMs?: number }) => {
      const { accessToken, user } = useAuthStore.getState();
      if (!accessToken || !user?.id) return;

      const warmup = prefetchCoreTabAssets(queryClient);
      if (options?.timeoutMs && options.timeoutMs > 0) {
        await withTimeout(warmup, options.timeoutMs);
        return;
      }
      await warmup;
    },
    [queryClient],
  );
};

export const useScheduleCoreTabAssetsPrefetch = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    const { accessToken, user } = useAuthStore.getState();
    if (!accessToken || !user?.id) return;
    requestIdleCallback(() => void prefetchCoreTabAssets(queryClient));
  }, [queryClient]);
};
