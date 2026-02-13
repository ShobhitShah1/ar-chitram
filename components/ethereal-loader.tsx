import React, { useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  interpolate,
  withDelay,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { FontFamily } from "@/constants/fonts";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface EtherealLoaderProps {
  isVisible: boolean;
  text?: string;
}

export const EtherealLoader: React.FC<EtherealLoaderProps> = ({
  isVisible,
  text = "Processing...",
}) => {
  const shimmerProgress = useSharedValue(0);
  const breatheProgress = useSharedValue(0);
  const backdropPulse = useSharedValue(0);

  const shimmerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: interpolate(
            shimmerProgress.value,
            [0, 1],
            [-SCREEN_WIDTH, SCREEN_WIDTH * 2]
          ),
        },
      ],
    };
  });

  const pillStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(breatheProgress.value, [0, 0.5, 1], [1, 1.015, 1]),
        },
      ],
      opacity: interpolate(breatheProgress.value, [0, 0.5, 1], [0.98, 1, 0.98]),
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: `rgba(0,0,0,${interpolate(
        backdropPulse.value,
        [0, 1],
        [0.5, 0.55]
      )})`,
    };
  });

  useEffect(() => {
    if (isVisible) {
      // Start shimmer immediately with infinite repeat
      shimmerProgress.value = withRepeat(
        withTiming(1, {
          duration: 1800,
          easing: Easing.linear,
        }),
        -1,
        false
      );

      // Breathing animation
      breatheProgress.value = withRepeat(
        withTiming(1, {
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );

      // Backdrop pulse
      backdropPulse.value = withRepeat(
        withTiming(1, {
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    } else {
      // Cancel all animations
      cancelAnimation(shimmerProgress);
      cancelAnimation(breatheProgress);
      cancelAnimation(backdropPulse);
    }

    return () => {
      cancelAnimation(shimmerProgress);
      cancelAnimation(breatheProgress);
      cancelAnimation(backdropPulse);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(250)}
      style={[StyleSheet.absoluteFill, styles.container]}
    >
      {/* Animated Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]} />

      {/* Shimmer Effect */}
      <View style={styles.shimmerContainer}>
        <Animated.View style={[styles.shimmerWrapper, shimmerStyle]}>
          <LinearGradient
            colors={[
              "transparent",
              "rgba(255,255,255,0.05)",
              "rgba(255,255,255,0.15)",
              "rgba(255,255,255,0.25)",
              "rgba(255,255,255,0.15)",
              "rgba(255,255,255,0.05)",
              "transparent",
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

      {/* Status Pill */}
      <Animated.View style={[styles.loadingPill, pillStyle]}>
        <LinearGradient
          colors={["rgba(20,20,20,0.95)", "rgba(10,10,10,0.95)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.pillGradient}
        >
          <View style={styles.pillContent}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={styles.loadingText}>{text}</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  shimmerContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  shimmerWrapper: {
    width: SCREEN_WIDTH * 0.6,
    height: "100%",
    position: "absolute",
  },
  loadingPill: {
    position: "absolute",
    bottom: "5%",
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  pillGradient: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
  },
  pillContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: FontFamily.medium,
    letterSpacing: 0.5,
  },
});
