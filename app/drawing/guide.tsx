import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { preview_1, preview_2 } from "@/assets/images";
import Header from "@/components/header";
import Carousel, { Pagination } from "@/components/ui/carousel";
import PrimaryButton from "@/components/ui/primary-button";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";

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

interface GuideItemProps {
  item: (typeof DATA)[0];
  index: number;
  pageWidth: number;
  cardWidth: number;
  cardHeight: number;
  descriptionFontSize: number;
  descriptionLineHeight: number;
  imageMarginBottom: number;
  scrollX: SharedValue<number>;
  theme: any;
}

const GuideItem: React.FC<GuideItemProps> = ({
  item,
  index,
  pageWidth,
  cardWidth,
  cardHeight,
  descriptionFontSize,
  descriptionLineHeight,
  imageMarginBottom,
  scrollX,
  theme,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * pageWidth,
      index * pageWidth,
      (index + 1) * pageWidth,
    ];

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.9, 1, 0.9],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.6, 1, 0.6],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <View style={[styles.itemContainer, { width: pageWidth }]}>
      <Animated.View
        style={[
          styles.imageContainer,
          {
            width: cardWidth,
            height: cardHeight,
            marginBottom: imageMarginBottom,
          },
          animatedStyle,
        ]}
      >
        <Image source={item.image} contentFit="cover" style={styles.image} />
      </Animated.View>
      <Text
        style={[
          styles.description,
          {
            color: theme.textPrimary,
            fontSize: descriptionFontSize,
            lineHeight: descriptionLineHeight,
          },
        ]}
      >
        {item.text}
      </Text>
    </View>
  );
};

const Guide = () => {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const scrollX = useSharedValue(0);
  const signatureText = Array.isArray(params.signatureText)
    ? params.signatureText[0]
    : params.signatureText;
  const signatureFont = Array.isArray(params.signatureFont)
    ? params.signatureFont[0]
    : params.signatureFont;
  const layout = useMemo(() => {
    const compact = screenHeight < 760;
    const headerHeight = 80;
    const reservedHeight = compact ? 210 : 244;
    const cardWidth = Math.min(screenWidth - 24, 392);
    const preferredCardHeight = Math.round(cardWidth * 1.28);
    const maxCardHeight = Math.max(
      compact ? 200 : 230,
      screenHeight - headerHeight - insets.bottom - reservedHeight,
    );
    const cardHeight = Math.min(preferredCardHeight, maxCardHeight);

    return {
      compact,
      pageWidth: screenWidth,
      cardWidth,
      cardHeight,
      carouselHeight: cardHeight + (compact ? 74 : 86),
      bottomPadding: Math.max(insets.bottom + 16, 24),
      titleMarginBottom: compact ? 18 : 28,
      contentPaddingTop: compact ? 8 : 14,
      paginationMarginTop: compact ? 8 : 12,
      footerMarginTop: compact ? 12 : 18,
      imageMarginBottom: compact ? 14 : 18,
      descriptionFontSize: compact ? 14 : 15,
      descriptionLineHeight: compact ? 20 : 22,
      buttonWidth: 180,
    };
  }, [insets.bottom, screenHeight, screenWidth]);

  const handleContinue = () => {
    // If we have an imageUri (from Virtual Creativity), pass it along
    if (params.imageUri) {
      router.replace({
        pathname: "/drawing/canvas",
        params: {
          imageUri: params.imageUri,
          signatureText,
          signatureFont,
        },
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
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Guide" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: layout.bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.content,
            {
              paddingTop: layout.contentPaddingTop,
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              {
                color: theme.textPrimary,
                marginBottom: layout.titleMarginBottom,
              },
            ]}
          >
            How to Sketch
          </Text>

          <View style={styles.carouselContainer}>
            <Carousel
              data={DATA}
              renderItem={({ item, index, scrollX }) => (
                <GuideItem
                  item={item}
                  index={index}
                  pageWidth={layout.pageWidth}
                  cardWidth={layout.cardWidth}
                  cardHeight={layout.cardHeight}
                  descriptionFontSize={layout.descriptionFontSize}
                  descriptionLineHeight={layout.descriptionLineHeight}
                  imageMarginBottom={layout.imageMarginBottom}
                  scrollX={scrollX}
                  theme={theme}
                />
              )}
              width={layout.pageWidth}
              itemWidth={layout.pageWidth}
              scrollX={scrollX}
              height={layout.carouselHeight}
            />
          </View>

          <View style={{ marginTop: layout.paginationMarginTop }}>
            <Pagination
              data={DATA}
              scrollX={scrollX}
              itemWidth={layout.pageWidth}
              activeDotColor={theme.textPrimary}
              dotColor={isDark ? "#555" : "#D9D9D9"}
            />
          </View>

          <View style={[styles.footer, { marginTop: layout.footerMarginTop }]}>
            <PrimaryButton
              title="Continue"
              onPress={handleContinue}
              style={[styles.button, { width: layout.buttonWidth }]}
              colors={theme.drawingButton as any}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default Guide;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: FontFamily.semibold,
    fontSize: 22,
    textAlign: "center",
  },
  carouselContainer: {
    width: "100%",
    alignItems: "center",
  },
  itemContainer: {
    alignItems: "center",
    paddingHorizontal: 12,
  },
  imageContainer: {
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 32,
  },
  description: {
    fontFamily: FontFamily.medium,
    textAlign: "center",
    paddingHorizontal: 14,
    maxWidth: 360,
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
