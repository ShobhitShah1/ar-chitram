import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState, useMemo, useCallback } from "react";
import { Dimensions, StyleSheet, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from "react-native-reanimated";

import { preview_1 } from "@/assets/images";
import Header from "@/components/header";
import PrimaryButton from "@/components/ui/primary-button";
import { useTheme } from "@/context/theme-context";
import { PreviewCarouselItem } from "@/features/virtual-creativity/components/preview-carousel-item";
import { useVirtualCreativityStore } from "@/features/virtual-creativity/store/virtual-creativity-store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const VirtualCreativityPreview = () => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { imageUri, originalImageUri, images } = useLocalSearchParams();

  // FIX: Separate selectors to prevent Zustand from causing infinite re-renders
  // Returning a new object from a Zustand selector causes an infinite update loop!
  const clearDrawingHistorySnapshots = useVirtualCreativityStore(
    (state) => state.clearDrawingHistorySnapshots,
  );
  const drawingHistorySnapshots = useVirtualCreativityStore(
    (state) => state.drawingHistorySnapshots,
  );

  const handleContinue = () => {
    clearDrawingHistorySnapshots();
    // Navigate to Guide with the image Uri
    router.push({
      pathname: "/drawing/guide",
      params: {
        imageUri: imageUri,
        originalImageUri: originalImageUri ?? imageUri,
      },
    });
  };

  const handleTrace = () => {
    clearDrawingHistorySnapshots();
    router.push({
      pathname: "/drawing/trace-canvas" as any,
      params: {
        imageUri: imageUri,
        originalImageUri: originalImageUri ?? imageUri,
      },
    });
  };

  const gridImages = useMemo(() => {
    if (typeof images === "string") {
      try {
        return JSON.parse(images);
      } catch (e) {
        return [];
      }
    }
    return [];
  }, [images]);

  const displayData = useMemo(() => {
    if (gridImages.length > 0) {
      return gridImages;
    }

    return drawingHistorySnapshots.length > 0
      ? drawingHistorySnapshots
      : [{ id: "fallback", uri: imageUri as string }];
  }, [drawingHistorySnapshots, imageUri, gridImages]);

  const initialIndex = useMemo(() => {
    if (gridImages.length > 0) {
      const idx = displayData.findIndex((item: any) => item.uri === imageUri);
      return Math.max(0, idx);
    }
    return Math.max(0, displayData.length - 1);
  }, [displayData, gridImages.length, imageUri]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const scrollX = useSharedValue(initialIndex * SCREEN_WIDTH);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      if (newIndex !== undefined && newIndex !== null) {
        setCurrentIndex((prev) => (prev === newIndex ? prev : newIndex));
      }
    }
  });

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 });

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      return (
        <PreviewCarouselItem
          item={item}
          index={index}
          scrollX={scrollX}
          theme={theme}
        />
      );
    },
    [scrollX, theme],
  );

  const activeImageUri = displayData[currentIndex]?.uri || imageUri;

  const handleContinueCurrent = () => {
    clearDrawingHistorySnapshots();
    router.push({
      pathname: "/drawing/guide",
      params: {
        imageUri: activeImageUri,
        originalImageUri: originalImageUri ?? activeImageUri,
      },
    });
  };

  const handleTraceCurrent = () => {
    clearDrawingHistorySnapshots();
    router.push({
      pathname: "/drawing/trace-canvas" as any,
      params: {
        imageUri: activeImageUri,
        originalImageUri: originalImageUri ?? activeImageUri,
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <Header title="Preview" />

      {/* Main Content */}
      <View style={styles.content}>
        <Animated.FlatList
          data={displayData}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.id || String(index)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewabilityConfig.current}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          bounces={false}
        />
      </View>

      {/* Footer */}
      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 40) }]}
      >
        <View style={styles.buttonRow}>
          <PrimaryButton
            title="Trace"
            onPress={handleTraceCurrent}
            style={styles.button}
            colors={theme.drawingButton as any}
          />
          <PrimaryButton
            title="Draw"
            onPress={handleContinueCurrent}
            style={styles.button}
            colors={theme.drawingButton as any}
          />
        </View>
      </View>
    </View>
  );
};

export default VirtualCreativityPreview;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  button: {
    flex: 1,
    maxWidth: 160,
    borderRadius: 100,
    height: 54,
  },
});
