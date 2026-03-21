import type { GridAssetItem } from "@/components/image-grid";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";

const resolveGridAssetUri = (item: Pick<GridAssetItem, "image">): string | null =>
  typeof item.image === "string"
    ? item.image
    : item.image &&
        typeof item.image === "object" &&
        "uri" in item.image &&
        typeof item.image.uri === "string"
      ? item.image.uri
      : null;

export const usePremiumAssetGuideFlow = () => {
  const router = useRouter();
  const [selectedPremiumAsset, setSelectedPremiumAsset] =
    useState<GridAssetItem | null>(null);

  const openGuide = useCallback(
    (item: GridAssetItem) => {
      const imageUri = resolveGridAssetUri(item);
      if (!imageUri) {
        return false;
      }

      router.push({
        pathname: "/drawing/guide",
        params: { imageUri },
      });

      return true;
    },
    [router],
  );

  const handleAssetPress = useCallback(
    (item: GridAssetItem) => {
      if (item.isPremium) {
        setSelectedPremiumAsset(item);
        return;
      }

      openGuide(item);
    },
    [openGuide],
  );

  const handleClosePremiumAsset = useCallback(() => {
    setSelectedPremiumAsset(null);
  }, []);

  const handleFreePremiumAsset = useCallback(() => {
    if (!selectedPremiumAsset) {
      return;
    }

    if (openGuide(selectedPremiumAsset)) {
      setSelectedPremiumAsset(null);
    }
  }, [openGuide, selectedPremiumAsset]);

  const handlePremiumAsset = useCallback(() => {
    if (!selectedPremiumAsset) {
      return;
    }

    if (openGuide(selectedPremiumAsset)) {
      setSelectedPremiumAsset(null);
    }
  }, [openGuide, selectedPremiumAsset]);

  return {
    selectedPremiumAsset,
    handleAssetPress,
    handleClosePremiumAsset,
    handleFreePremiumAsset,
    handlePremiumAsset,
  };
};
