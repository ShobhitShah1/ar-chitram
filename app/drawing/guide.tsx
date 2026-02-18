import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { preview_1, preview_2 } from "@/assets/images";
import Header from "@/components/header";
import { useCommonThemedStyles } from "@/components/themed";
import Carousel, { Pagination } from "@/components/ui/carousel";
import PrimaryButton from "@/components/ui/primary-button";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  scrollX: SharedValue<number>;
  theme: any;
}

const GuideItem: React.FC<GuideItemProps> = ({
  item,
  index,
  scrollX,
  theme,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
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
    <View style={styles.itemContainer}>
      <Animated.View style={[styles.imageContainer, animatedStyle]}>
        <Image source={item.image} contentFit="cover" style={styles.image} />
      </Animated.View>
      <Text style={[styles.description, { color: theme.textPrimary }]}>
        {item.text}
      </Text>
    </View>
  );
};

const Guide = () => {
  const params = useLocalSearchParams();
  const { theme, isDark } = useTheme();
  const scrollX = useSharedValue(0);

  const handleContinue = () => {
    // If we have an imageUri (from Virtual Creativity), pass it along
    if (params.imageUri) {
      router.replace({
        pathname: "/drawing/canvas",
        params: { imageUri: params.imageUri },
      });
    } else {
      router.replace("/drawing/canvas");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Guide" />

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          How to Sketch
        </Text>

        <View style={styles.carouselContainer}>
          <Carousel
            data={DATA}
            renderItem={({ item, index, scrollX }) => (
              <GuideItem
                item={item}
                index={index}
                scrollX={scrollX}
                theme={theme}
              />
            )}
            width={SCREEN_WIDTH}
            itemWidth={SCREEN_WIDTH}
            scrollX={scrollX}
          />
        </View>

        <Pagination
          data={DATA}
          scrollX={scrollX}
          itemWidth={SCREEN_WIDTH}
          activeDotColor={theme.textPrimary}
          dotColor={isDark ? "#555" : "#D9D9D9"}
        />

        <View style={styles.footer}>
          <PrimaryButton
            title="Continue"
            onPress={handleContinue}
            style={styles.button}
            colors={theme.drawingButton as any}
          />
        </View>
      </View>
    </View>
  );
};

export default Guide;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingTop: 10,
  },
  title: {
    fontFamily: FontFamily.semibold,
    fontSize: 22,
    marginBottom: 30,
    textAlign: "center",
  },
  carouselContainer: {
    height: SCREEN_WIDTH * 1.5,
  },
  itemContainer: {
    width: SCREEN_WIDTH,
    alignItems: "center",
    paddingHorizontal: 15,
  },
  imageContainer: {
    width: "100%",
    height: SCREEN_WIDTH * 1.3,
    borderRadius: 32,
    overflow: "hidden",
    marginBottom: 30,
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
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 10,
    lineHeight: 22,
  },
  footer: {
    position: "absolute",
    bottom: 50,
    width: "100%",
    alignItems: "center",
  },
  button: {
    width: 180,
    height: 52,
    borderRadius: 100,
  },
});
