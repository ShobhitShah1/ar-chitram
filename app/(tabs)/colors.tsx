import { CategoryChips } from "@/components/category-chips";
import { EmptyState } from "@/components/empty-state";
import ImageGrid, { GridAssetItem } from "@/components/image-grid";
import TabsHeader from "@/components/tabs-header";
import { useCommonThemedStyles } from "@/components/themed";
import { useColorsTabGrid } from "@/hooks/api";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import { View } from "react-native";

export default function Colors() {
  const commonStyles = useCommonThemedStyles();
  const router = useRouter();
  const {
    categories,
    selectedCategory,
    setSelectedCategory,
    gridItems,
    shuffle,
    isLoading,
    isError,
  } = useColorsTabGrid();

  const handlePress = useCallback(
    (item: GridAssetItem) => {
      const imageUri =
        typeof item.image === "string"
          ? item.image
          : item.image && typeof item.image === "object" && "uri" in item.image
            ? item.image.uri
            : null;

      if (!imageUri) {
        return;
      }

      router.push({
        pathname: "/drawing/guide",
        params: { imageUri },
      });
    },
    [router],
  );

  console.log(gridItems);

  return (
    <View style={commonStyles.container}>
      <TabsHeader isShuffle onShufflePress={shuffle} />
      <CategoryChips
        items={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {isLoading ? (
        <EmptyState showLoading title="Loading color assets..." />
      ) : isError ? (
        <EmptyState
          title="Unable to load colors"
          description="Please try again in a moment."
        />
      ) : gridItems.length === 0 ? (
        <EmptyState
          title="No color assets"
          description="No images found for this category."
        />
      ) : (
        <ImageGrid data={gridItems} onPress={handlePress} />
      )}
    </View>
  );
}
