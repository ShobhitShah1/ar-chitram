import type { GridAssetItem } from "@/components/image-grid";
import { useGigglamIAPContext } from "@/context/iap-context";
import { useOptimizedRewardedAd } from "@/hooks/use-rewarded-ad";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Toast from "react-native-toast-message";

const resolveGridAssetUri = (
  item: Pick<GridAssetItem, "image">,
): string | null =>
  typeof item.image === "string"
    ? item.image
    : item.image &&
        typeof item.image === "object" &&
        "uri" in item.image &&
        typeof item.image.uri === "string"
      ? item.image.uri
      : null;

const getAssetSku = (
  item?: Pick<GridAssetItem, "isPremium" | "sku"> | null,
): string | null => {
  if (!item?.isPremium) {
    return null;
  }

  const sku = item.sku?.trim();
  return sku && sku.length > 0 ? sku : null;
};

interface UsePremiumAssetActionFlowOptions<T extends GridAssetItem> {
  onUnlockedAction: (item: T) => boolean | void | Promise<boolean | void>;
  preloadItems?: readonly T[];
}

export const usePremiumAssetActionFlow = <T extends GridAssetItem>({
  onUnlockedAction,
  preloadItems,
}: UsePremiumAssetActionFlowOptions<T>) => {
  const [selectedPremiumAsset, setSelectedPremiumAsset] = useState<T | null>(
    null,
  );

  const pendingRewardAssetRef = useRef<T | null>(null);
  const pendingPurchaseAssetRef = useRef<T | null>(null);
  const rewardEarnedRef = useRef(false);
  const lastPurchaseErrorRef = useRef<string | null>(null);

  const {
    getProduct,
    isPurchased,
    purchaseProduct,
    ensureProductLoaded,
    ensureProductsLoaded,
    isPurchasing,
    error: purchaseError,
  } = useGigglamIAPContext();

  const resolveAssetSku = useCallback(
    (item?: T | null) => getAssetSku(item),
    [],
  );

  const isPremiumAssetUnlocked = useCallback(
    (item?: T | null) => {
      if (!item?.isPremium) {
        return true;
      }

      const assetSku = resolveAssetSku(item);
      return assetSku ? isPurchased(assetSku) : false;
    },
    [isPurchased, resolveAssetSku],
  );

  const preloadAssetProduct = useCallback(
    async (item?: T | null) => {
      const assetSku = resolveAssetSku(item);
      if (!assetSku) {
        return;
      }

      await ensureProductLoaded(assetSku);
    },
    [ensureProductLoaded, resolveAssetSku],
  );

  const getPremiumPriceLabelForAsset = useCallback(
    (item?: T | null) => {
      const assetSku = resolveAssetSku(item);
      return assetSku ? getProduct(assetSku)?.price : undefined;
    },
    [getProduct, resolveAssetSku],
  );

  const preloadAssetProducts = useCallback(
    async (items?: readonly T[] | null) => {
      const assetSkus = Array.from(
        new Set(
          (items ?? [])
            .map((item) => resolveAssetSku(item))
            .filter((sku): sku is string => Boolean(sku)),
        ),
      );

      if (!assetSkus.length) {
        return;
      }

      await ensureProductsLoaded(assetSkus);
    },
    [ensureProductsLoaded, resolveAssetSku],
  );

  const clearPendingFlow = useCallback(() => {
    pendingRewardAssetRef.current = null;
    pendingPurchaseAssetRef.current = null;
    rewardEarnedRef.current = false;
  }, []);

  const {
    isLoaded: isRewardedAdLoaded,
    isLoading: isRewardedAdLoading,
    isShowing: isRewardedAdShowing,
    adBlockerDetected,
    showAd,
  } = useOptimizedRewardedAd({
    onRewardEarned: () => {
      rewardEarnedRef.current = true;
      const asset = pendingRewardAssetRef.current;
      clearPendingFlow();

      if (!asset) {
        return;
      }

      void runUnlockedAsset(asset);
    },
    onAdClosed: () => {
      if (!rewardEarnedRef.current) {
        pendingRewardAssetRef.current = null;
      }
      rewardEarnedRef.current = false;
    },
    onAdError: () => {
      pendingRewardAssetRef.current = null;
      rewardEarnedRef.current = false;
    },
  });

  const runUnlockedAction = useCallback(
    async (item: T) => {
      const result = await Promise.resolve(onUnlockedAction(item));
      return result !== false;
    },
    [onUnlockedAction],
  );

  const runUnlockedAsset = useCallback(
    async (item: T) => {
      const didContinue = await runUnlockedAction(item);
      if (didContinue) {
        setSelectedPremiumAsset(null);
      }
      return didContinue;
    },
    [runUnlockedAction],
  );

  useEffect(() => {
    const asset = pendingPurchaseAssetRef.current;

    if (!asset || !isPremiumAssetUnlocked(asset)) {
      return;
    }

    clearPendingFlow();
    void runUnlockedAsset(asset);
  }, [clearPendingFlow, isPremiumAssetUnlocked, runUnlockedAsset]);

  useEffect(() => {
    if (!selectedPremiumAsset?.isPremium) {
      return;
    }

    void preloadAssetProduct(selectedPremiumAsset);
  }, [preloadAssetProduct, selectedPremiumAsset]);

  useEffect(() => {
    void preloadAssetProducts(preloadItems);
  }, [preloadAssetProducts, preloadItems]);

  useEffect(() => {
    if (
      !pendingRewardAssetRef.current ||
      !isRewardedAdLoaded ||
      isRewardedAdShowing
    ) {
      return;
    }

    showAd();
  }, [isRewardedAdLoaded, isRewardedAdShowing, showAd]);

  useEffect(() => {
    if (!adBlockerDetected || !pendingRewardAssetRef.current) {
      return;
    }

    clearPendingFlow();
  }, [adBlockerDetected, clearPendingFlow]);

  useEffect(() => {
    if (!purchaseError || purchaseError === lastPurchaseErrorRef.current) {
      return;
    }

    lastPurchaseErrorRef.current = purchaseError;
    pendingPurchaseAssetRef.current = null;

    Toast.show({
      type: "error",
      text1: "Purchase failed",
      text2: purchaseError,
    });
  }, [purchaseError]);

  const handleAssetPress = useCallback(
    (item: T) => {
      if (item.isPremium && !isPremiumAssetUnlocked(item)) {
        setSelectedPremiumAsset(item);
        void preloadAssetProduct(item);
        return;
      }

      void runUnlockedAsset(item);
    },
    [isPremiumAssetUnlocked, preloadAssetProduct, runUnlockedAsset],
  );

  const handleClosePremiumAsset = useCallback(() => {
    clearPendingFlow();
    setSelectedPremiumAsset(null);
  }, [clearPendingFlow]);

  const handleFreePremiumAsset = useCallback(
    (assetOverride?: T | null) => {
      const targetAsset = assetOverride ?? selectedPremiumAsset;
      if (!targetAsset) {
        return;
      }

      if (isPremiumAssetUnlocked(targetAsset)) {
        void runUnlockedAsset(targetAsset);
        return;
      }

      if (adBlockerDetected) {
        Toast.show({
          type: "error",
          text1: "Ad blocked",
          text2: "Ads are unavailable on this device right now.",
        });
        return;
      }

      pendingRewardAssetRef.current = targetAsset;
      rewardEarnedRef.current = false;
      showAd();
    },
    [
      adBlockerDetected,
      isPremiumAssetUnlocked,
      runUnlockedAsset,
      selectedPremiumAsset,
      showAd,
    ],
  );

  const handlePremiumAsset = useCallback(
    async (assetOverride?: T | null) => {
      const targetAsset = assetOverride ?? selectedPremiumAsset;
      if (!targetAsset) {
        return;
      }

      if (isPremiumAssetUnlocked(targetAsset)) {
        await runUnlockedAsset(targetAsset);
        return;
      }

      const targetSku = resolveAssetSku(targetAsset);
      if (!targetSku) {
        Toast.show({
          type: "error",
          text1: "Purchase unavailable",
          text2: "This premium item is missing a product id.",
        });
        return;
      }

      pendingPurchaseAssetRef.current = targetAsset;
      lastPurchaseErrorRef.current = null;
      await ensureProductLoaded(targetSku);
      const purchaseRequested = await purchaseProduct(targetSku);

      if (!purchaseRequested) {
        pendingPurchaseAssetRef.current = null;
      }
    },
    [
      ensureProductLoaded,
      isPremiumAssetUnlocked,
      purchaseProduct,
      resolveAssetSku,
      runUnlockedAsset,
      selectedPremiumAsset,
    ],
  );

  const premiumPriceLabel = useMemo(
    () => getPremiumPriceLabelForAsset(selectedPremiumAsset),
    [getPremiumPriceLabelForAsset, selectedPremiumAsset],
  );

  return {
    selectedPremiumAsset,
    premiumPriceLabel,
    isPremiumAssetUnlocked,
    getPremiumPriceLabelForAsset,
    preloadAssetProduct,
    isFreePremiumActionBusy: isRewardedAdLoading || isRewardedAdShowing,
    isPremiumActionBusy: isPurchasing,
    handleAssetPress,
    handleClosePremiumAsset,
    handleFreePremiumAsset,
    handlePremiumAsset,
  };
};

export const usePremiumAssetGuideFlow = (
  options?: Pick<
    UsePremiumAssetActionFlowOptions<GridAssetItem>,
    "preloadItems"
  >,
) => {
  const router = useRouter();

  const openGuide = useCallback(
    (item: GridAssetItem) => {
      const imageUri = resolveGridAssetUri(item);
      if (!imageUri) {
        return false;
      }

      router.push({
        pathname: "/virtual-creativity/preview",
        params: { imageUri },
      });

      return true;
    },
    [router],
  );

  return usePremiumAssetActionFlow<GridAssetItem>({
    onUnlockedAction: openGuide,
    preloadItems: options?.preloadItems,
  });
};
