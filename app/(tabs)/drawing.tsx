import { PremiumAssetModal } from "@/components/premium-asset-modal";
import { CategoryChips } from "@/components/category-chips";
import { EmptyState } from "@/components/empty-state";
import ImageGrid from "@/components/image-grid";
import TabsHeader from "@/components/tabs-header";
import { useCommonThemedStyles } from "@/components/themed";
import { useDrawingsTabGrid } from "@/hooks/api";
import { usePremiumAssetGuideFlow } from "@/hooks/use-premium-asset-guide-flow";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback } from "react";
import { FlatList, View } from "react-native";

const Drawing = () => {
  const navigation = useNavigation();
  const listRef = React.useRef<FlatList>(null);
  const commonStyles = useCommonThemedStyles();
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
  } = useDrawingsTabGrid();
  const {
    selectedPremiumAsset,
    premiumPriceLabel,
    isFreePremiumActionBusy,
    isPremiumActionBusy,
    handleAssetPress,
    handleClosePremiumAsset,
    handleFreePremiumAsset,
    handlePremiumAsset,
    isPremiumAssetUnlocked,
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
    <EmptyState showLoading title="Loading drawing assets..." />
  ) : showErrorState ? (
    <EmptyState
      title="Unable to load drawings"
      description="Please try again in a moment."
    />
  ) : gridItems.length === 0 ? (
    <EmptyState
      title="No drawing assets"
      description="No images found for this category."
    />
  ) : null;

  React.useEffect(() => {
    const unsubscribe = (navigation as any).addListener("scrollToTopTab", () => {
      listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <View style={commonStyles.container}>
      <TabsHeader isShuffle screenId="drawings" onShufflePress={shuffle} />

      <CategoryChips
        items={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <ImageGrid
        listRef={listRef}
        data={emptyState ? [] : gridItems}
        onPress={handleAssetPress}
        isUnlocked={isPremiumAssetUnlocked}
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
};

export default Drawing;
