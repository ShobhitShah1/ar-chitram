import { router, useLocalSearchParams } from "expo-router";
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, useWindowDimensions, View } from "react-native";
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { preview_1, preview_2 } from "@/assets/images";
import Header from "@/components/header";
import Carousel, { Pagination } from "@/components/ui/carousel";
import PrimaryButton from "@/components/ui/primary-button";
import { useTheme } from "@/context/theme-context";

import { GuideItem } from "@/components/drawing/guide-item";

const DATA = [
  {
    id: 1,
    image: preview_1,
    text: "Place your phone on glass or any other object and sketch with perfect accuracy",
  },
  {
    id: 2,
    image: preview_2,
    text: "Create artist-quality sketches from images",
  },
];

const Guide = () => {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { theme, isDark } = useTheme();

  const scrollX = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const signatureText = Array.isArray(params.signatureText)
    ? params.signatureText[0]
    : params.signatureText;
  const signatureFont = Array.isArray(params.signatureFont)
    ? params.signatureFont[0]
    : params.signatureFont;
  const originalImageUri = Array.isArray(params.originalImageUri)
    ? params.originalImageUri[0]
    : params.originalImageUri;
  const restoredSnapshots = Array.isArray(params.restoredSnapshots)
    ? params.restoredSnapshots[0]
    : params.restoredSnapshots;

  const layout = useMemo(() => {
    const headerHeight = 72;
    const footerHeight = 110;
    const spacing = 18;

    const cardWidth = Math.min(screenWidth - 32, 400);
    const availableHeight =
      screenHeight - headerHeight - insets.bottom - footerHeight - spacing;
    const cardHeight = Math.max(availableHeight, 200);

    return {
      pageWidth: screenWidth,
      cardWidth,
      cardHeight,
      buttonWidth: 200,
      paginationMarginTop: 0,
      footerMarginTop: 20,
      titleMarginBottom: 16,
    };
  }, [insets.bottom, screenHeight, screenWidth]);

  useAnimatedReaction(
    () => Math.round(scrollX.value / layout.pageWidth),
    (next) => {
      if (next !== activeIndex) {
        runOnJS(setActiveIndex)(next);
      }
    },
    [layout.pageWidth, activeIndex],
  );

  const handlePress = useCallback(() => {
    const isLastSlide = activeIndex === DATA.length - 1;

    if (!isLastSlide) {
      // Scroll to next
      flatListRef.current?.scrollToIndex({
        index: activeIndex + 1,
        animated: true,
      });
      return;
    }

    // Otherwise proceed to canvas
    const navigationParams = {
      imageUri: params.imageUri,
      originalImageUri: originalImageUri ?? params.imageUri,
      restoredSnapshots,
      signatureText,
      signatureFont,
    };

    if (params.fromEdit === "true") {
      router.back();
      return;
    }

    if (params.imageUri) {
      router.replace({
        pathname: "/drawing/canvas",
        params: navigationParams,
      });
    } else {
      router.replace({
        pathname: "/drawing/canvas",
        params: {
          signatureText,
          signatureFont,
        },
      });
    }
  }, [
    activeIndex,
    originalImageUri,
    params.imageUri,
    restoredSnapshots,
    signatureFont,
    signatureText,
    params.fromEdit,
  ]);

  const isLastPage = activeIndex === DATA.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="How to sketch" />

      <View style={styles.flexContent}>
        <View style={styles.carouselContainer}>
          <Carousel
            flatListRef={flatListRef}
            data={DATA}
            renderItem={({ item, index, scrollX }) => (
              <GuideItem
                item={item}
                index={index}
                pageWidth={layout.pageWidth}
                cardWidth={layout.cardWidth}
                cardHeight={layout.cardHeight}
                scrollX={scrollX}
              />
            )}
            width={layout.pageWidth}
            itemWidth={layout.pageWidth}
            scrollX={scrollX}
            height={layout.cardHeight}
          />
        </View>

        <View>
          <Pagination
            data={DATA}
            scrollX={scrollX}
            itemWidth={layout.pageWidth}
            activeDotColor={theme.textPrimary}
            dotColor={isDark ? "#333" : "#D9D9D9"}
          />
        </View>

        <View
          style={[
            styles.footer,
            {
              marginTop: layout.footerMarginTop,
              marginBottom: Math.max(insets.bottom, 24),
            },
          ]}
        >
          <PrimaryButton
            title={isLastPage ? "Continue" : "Next"}
            onPress={handlePress}
            style={[styles.button, { width: layout.buttonWidth }]}
            colors={theme.drawingButton as any}
          />
        </View>
      </View>
    </View>
  );
};

export default memo(Guide);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  carouselContainer: {
    width: "100%",
    alignItems: "center",
  },
  footer: {
    width: "100%",
    alignItems: "center",
  },
  button: {
    height: 52,
    borderRadius: 100,
  },
});
