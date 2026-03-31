import { PremiumAssetModal } from "@/components/premium-asset-modal";
import { CategoryChips } from "@/components/category-chips";
import { EmptyState } from "@/components/empty-state";
import ImageGrid from "@/components/image-grid";
import TabsHeader from "@/components/tabs-header";
import { useCommonThemedStyles } from "@/components/themed";
import { useSketchesTabGrid } from "@/hooks/api";
import { useAppPermissions } from "@/hooks/use-app-permissions";
import { usePremiumAssetGuideFlow } from "@/hooks/use-premium-asset-guide-flow";
import React, { useCallback } from "react";
import { View } from "react-native";

export default function Sketch() {
  const commonStyles = useCommonThemedStyles();
  useAppPermissions();
  const {
    data,
    categories,
    selectedCategory,
    setSelectedCategory,
    gridItems,
    shuffle,
    isLoading,
    isError,
    refetch,
  } = useSketchesTabGrid();
  const {
    selectedPremiumAsset,
    premiumPriceLabel,
    isFreePremiumActionBusy,
    isPremiumActionBusy,
    handleAssetPress,
    handleClosePremiumAsset,
    handleFreePremiumAsset,
    handlePremiumAsset,
  } = usePremiumAssetGuideFlow({
    preloadItems: gridItems,
  });
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(() => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    void refetch().finally(() => {
      setRefreshing(false);
    });
  }, [refetch, refreshing]);

  const isInitialLoading = isLoading && !data;
  const showErrorState = isError && !data;

  const emptyState = isInitialLoading ? (
    <EmptyState showLoading title="Loading sketch assets..." />
  ) : showErrorState ? (
    <EmptyState
      title="Unable to load sketches"
      description="Please try again in a moment."
    />
  ) : gridItems.length === 0 ? (
    <EmptyState
      title="No sketch assets"
      description="No images found for this category."
    />
  ) : null;

  return (
    <View style={commonStyles.container}>
      <TabsHeader isShuffle onShufflePress={shuffle} />

      <CategoryChips
        items={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <ImageGrid
        data={emptyState ? [] : gridItems}
        onPress={handleAssetPress}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={emptyState}
      />

      <PremiumAssetModal
        asset={selectedPremiumAsset}
        visible={!!selectedPremiumAsset}
        onClose={handleClosePremiumAsset}
        onFreePress={handleFreePremiumAsset}
        onPremiumPress={handlePremiumAsset}
        freeDisabled={isFreePremiumActionBusy}
        premiumDisabled={isPremiumActionBusy}
        premiumPriceLabel={premiumPriceLabel}
      />
    </View>
  );
}
