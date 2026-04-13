import { useCallback, useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { searchPixabayImages } from "@/services/pixabay-service";
import { searchPexelsImages } from "@/services/pexels-service";
import { searchUnsplashImages } from "@/services/unsplash-service";
import { apiQueryKeys } from "@/services/api/query-keys";
import type { GridAssetItem } from "@/components/image-grid";
import { Keyboard } from "react-native";

export type SearchMode = "sketch" | "color" | "drawing";
export type ImageProvider = "pixabay" | "pexels" | "unsplash";
export type ImageOrientation = "all" | "portrait" | "landscape";

export interface SearchImageItem extends GridAssetItem {
  originalUrl: string;
  author: string;
  source: Exclude<ImageProvider, "all">;
  width: number;
  height: number;
}

/**
 * Hook to manage multi-source image search with pagination.
 * Accumulates results as the user loads more pages.
 */
export const useImageSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [modeFilter, setModeFilter] = useState<SearchMode>("sketch");
  const orientationFilter: ImageOrientation = "portrait";
  const [page, setPage] = useState(1);
  const [accumulatedImages, setAccumulatedImages] = useState<SearchImageItem[]>(
    [],
  );

  const Page_INITIAL = 1;

  useEffect(() => {
    setPage(Page_INITIAL);
    setAccumulatedImages([]);
  }, [modeFilter]);

  const modifiedQuery = useMemo(() => {
    if (!activeQuery) return "";
    const trimmed = activeQuery.trim();
    switch (modeFilter) {
      case "sketch":
        return `${trimmed} sketch`;
      case "color":
        return `${trimmed} coloring book`;
      case "drawing":
        return `${trimmed} line art`;
      default:
        return trimmed;
    }
  }, [activeQuery, modeFilter]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setActiveQuery("");
    setPage(Page_INITIAL);
    setAccumulatedImages([]);
  }, []);

  const performSearch = useCallback(() => {
    Keyboard.dismiss();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      if (trimmed !== activeQuery) {
        setAccumulatedImages([]); // Clear results ONLY on new search query
      }
      setActiveQuery(trimmed);
      setPage(Page_INITIAL);
    }
  }, [searchQuery]);

  const hasQuery = activeQuery.length > 0;

  // --- PIXABAY SEARCH ---
  const pixabayResult = useQuery({
    queryKey: [
      ...apiQueryKeys.search.images(modifiedQuery, page),
      "pixabay",
      orientationFilter,
    ],
    queryFn: () =>
      searchPixabayImages({
        query: modifiedQuery,
        page,
        perPage: 20,
        orientation: "vertical",
        imageType: "illustration",
      }),
    enabled: hasQuery,
    staleTime: 5 * 60 * 1000,
  });

  // --- PEXELS SEARCH ---
  const pexelsResult = useQuery({
    queryKey: [
      ...apiQueryKeys.search.images(modifiedQuery, page),
      "pexels",
      orientationFilter,
    ],
    queryFn: () => searchPexelsImages(modifiedQuery, page, 20, "portrait"),
    enabled: hasQuery,
    staleTime: 5 * 60 * 1000,
  });

  // --- UNSPLASH SEARCH ---
  const unsplashResult = useQuery({
    queryKey: [
      ...apiQueryKeys.search.images(modifiedQuery, page),
      "unsplash",
      orientationFilter,
    ],
    queryFn: () => searchUnsplashImages(modifiedQuery, page, 20, "portrait"),
    enabled: hasQuery,
    staleTime: 5 * 60 * 1000,
  });

  // --- ACCUMULATE AND UNIFY ---
  useEffect(() => {
    if (!pixabayResult.data && !pexelsResult.data && !unsplashResult.data) {
      return;
    }

    const pixabayHits = pixabayResult.data?.hits ?? [];
    const pexelsPhotos = pexelsResult.data?.photos ?? [];
    const unsplashResults = unsplashResult.data?.results ?? [];

    if (
      pixabayHits.length === 0 &&
      pexelsPhotos.length === 0 &&
      unsplashResults.length === 0
    ) {
      return;
    }

    const unifiedPage: SearchImageItem[] = [];
    const maxLen = Math.max(
      pixabayHits.length,
      pexelsPhotos.length,
      unsplashResults.length,
    );

    for (let i = 0; i < maxLen; i++) {
      if (i < pexelsPhotos.length) {
        const img = pexelsPhotos[i];
        unifiedPage.push({
          id: `pexels-${img.id}`,
          image: img.src.medium,
          originalUrl: img.src.original,
          author: img.photographer,
          source: "pexels",
          mediaType: "photo",
          width: img.width,
          height: img.height,
        });
      }
      if (i < pixabayHits.length) {
        const img = pixabayHits[i];
        unifiedPage.push({
          id: `pixabay-${img.id}`,
          image: img.previewURL,
          originalUrl: img.largeImageURL,
          author: img.user,
          source: "pixabay",
          mediaType: "photo",
          width: img.imageWidth,
          height: img.imageHeight,
        });
      }
      if (i < unsplashResults.length) {
        const img = unsplashResults[i];
        unifiedPage.push({
          id: `unsplash-${img.id}`,
          image: img.urls.small,
          originalUrl: img.urls.regular,
          author: img.user.name,
          source: "unsplash",
          mediaType: "photo",
          width: img.width,
          height: img.height,
        });
      }
    }

    setAccumulatedImages((prev) => {
      if (page === 1) {
        // For the first page, replace the entire list to handle refreshes correctly
        return unifiedPage;
      }

      // For subsequent pages, append filtered unique results
      const existingIds = new Set(prev.map((img) => img.id));
      const filteredNew = unifiedPage.filter((img) => !existingIds.has(img.id));
      return [...prev, ...filteredNew];
    });
  }, [pixabayResult.data, pexelsResult.data, unsplashResult.data]);

  const images = useMemo(() => {
    return accumulatedImages;
  }, [accumulatedImages]);

  const isLoading =
    (pixabayResult.isLoading ||
      pexelsResult.isLoading ||
      unsplashResult.isLoading) &&
    page === 1 &&
    hasQuery;

  const isFetching =
    pixabayResult.isFetching ||
    pexelsResult.isFetching ||
    unsplashResult.isFetching;

  const isError =
    pixabayResult.isError && pexelsResult.isError && unsplashResult.isError;

  const loadMore = useCallback(() => {
    if (hasQuery && !isFetching) {
      setPage((prev) => prev + 1);
    }
  }, [hasQuery, isFetching]);

  return {
    searchQuery,
    activeQuery,
    handleSearchChange,
    performSearch,
    clearSearch,
    images,
    isLoading,
    isFetching,
    isError,
    loadMore,
    hasQuery,
    modeFilter,
    setModeFilter,
    hasMore:
      (pixabayResult.data?.hits?.length ?? 0) >= 20 ||
      (pexelsResult.data?.photos?.length ?? 0) >= 20 ||
      (unsplashResult.data?.results?.length ?? 0) >= 20,
  };
};
