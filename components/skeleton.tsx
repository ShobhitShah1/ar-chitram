import React, { useEffect } from "react";
import {
  StyleSheet,
  View,
  ViewStyle,
  LayoutChangeEvent,
  DimensionValue,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { useTheme } from "@/context/theme-context";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * A clean, high-performance skeleton loader with a smooth linear shimmer.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = "100%",
  borderRadius = 12,
  style,
}) => {
  const { theme } = useTheme();
  const shimmerValue = useSharedValue(0);
  const [layoutWidth, setLayoutWidth] = React.useState(0);

  useEffect(() => {
    shimmerValue.value = withRepeat(
      withTiming(1, {
        duration: 1200,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
      }),
      -1,
      false,
    );
  }, []);

  const onLayout = (event: LayoutChangeEvent) => {
    setLayoutWidth(event.nativeEvent.layout.width);
  };

  const animatedShimmerStyle = useAnimatedStyle(() => {
    const widthToUse = layoutWidth || 400;
    return {
      transform: [
        {
          translateX: interpolate(shimmerValue.value, [0, 1], [-widthToUse, widthToUse]),
        },
      ],
    };
  });

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.skeletonBase,
        },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmerLayer, animatedShimmerStyle]}>
        <LinearGradient
          colors={["transparent", theme.skeletonHighlight, "transparent"]}
          locations={[0.2, 0.5, 0.8]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  shimmerLayer: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
  },
});
