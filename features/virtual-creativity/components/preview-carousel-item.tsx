import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from "react-native-reanimated";

import { preview_1 } from "@/assets/images";
import { StoryFramePreviewCard } from "@/components/story/story-frame-preview-card";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface PreviewCarouselItemProps {
  item: any;
  index: number;
  scrollX: SharedValue<number>;
  theme: any;
}

export const PreviewCarouselItem = React.memo(
  ({ item, index, scrollX, theme }: PreviewCarouselItemProps) => {
    const animatedStyle = useAnimatedStyle(() => {
      const inputRange = [
        (index - 1) * SCREEN_WIDTH,
        index * SCREEN_WIDTH,
        (index + 1) * SCREEN_WIDTH,
      ];

      const scale = interpolate(
        scrollX.value,
        inputRange,
        [0.85, 1, 0.85],
        Extrapolation.CLAMP,
      );

      const opacity = interpolate(
        scrollX.value,
        inputRange,
        [0.5, 1, 0.5],
        Extrapolation.CLAMP,
      );

      return {
        transform: [{ scale }],
        opacity,
      };
    });

    return (
      <View style={styles.carouselItem}>
        <Animated.View style={animatedStyle}>
          <StoryFramePreviewCard
            source={{ uri: item.uri || preview_1 }}
            cardBackgroundColor={theme.cardBackground}
          />
        </Animated.View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  carouselItem: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
