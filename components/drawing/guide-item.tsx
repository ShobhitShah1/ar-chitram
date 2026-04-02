import { Image } from "expo-image";
import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

interface GuideItemProps {
  item: {
    id: number;
    image: any;
    text: string;
  };
  index: number;
  pageWidth: number;
  cardWidth: number;
  cardHeight: number;
  scrollX: SharedValue<number>;
}

export const GuideItem: React.FC<GuideItemProps> = ({
  item,
  index,
  pageWidth,
  cardWidth,
  cardHeight,
  scrollX,
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
          },
          animatedStyle,
        ]}
      >
        <Image source={item.image} contentFit="contain" style={styles.image} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  imageContainer: {
    borderRadius: 24,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 32,
  },
});
