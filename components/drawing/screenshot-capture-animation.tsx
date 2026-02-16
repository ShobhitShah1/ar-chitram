import { Image } from "expo-image";
import React, { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface ScreenshotCaptureAnimationProps {
  visible: boolean;
  imageUri: string | null;
  targetPosition: { x: number; y: number };
  onAnimationComplete: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const FLASH_DURATION = 80;
const PREVIEW_HOLD_DURATION = 600;
const SCALE_DOWN_DURATION = 200;
const FLY_SPRING_CONFIG = {
  mass: 1.0,
  damping: 12,
  stiffness: 80,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

const TARGET_SIZE = 60;

export const ScreenshotCaptureAnimation: React.FC<
  ScreenshotCaptureAnimationProps
> = ({ visible, imageUri, targetPosition, onAnimationComplete }) => {
  const animationProgress = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const flyProgress = useSharedValue(0);

  useEffect(() => {
    if (visible && imageUri) {
      // Reset
      animationProgress.value = 0;
      flashOpacity.value = 0.15;
      flyProgress.value = 0;

      flashOpacity.value = withTiming(0, {
        duration: 150,
        easing: Easing.out(Easing.cubic),
      });

      animationProgress.value = withDelay(
        FLASH_DURATION,
        withSequence(
          withTiming(0.15, {
            duration: PREVIEW_HOLD_DURATION,
            easing: Easing.out(Easing.ease),
          }),
          withTiming(0.25, {
            duration: SCALE_DOWN_DURATION,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
      );

      const flyDelay =
        FLASH_DURATION + PREVIEW_HOLD_DURATION + SCALE_DOWN_DURATION;
      flyProgress.value = withDelay(flyDelay, withSpring(1, FLY_SPRING_CONFIG));

      const timer = setTimeout(() => {
        onAnimationComplete();
      }, flyDelay + 600);

      return () => clearTimeout(timer);
    }
  }, [visible, imageUri]);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const imageAnimatedStyle = useAnimatedStyle(() => {
    const previewProgress = animationProgress.value;
    const fly = flyProgress.value;

    const previewScale = interpolate(
      previewProgress,
      [0, 0.15, 0.25],
      [1, 0.97, 0.35],
    );

    const finalScale = interpolate(
      fly,
      [0, 1],
      [0.35, TARGET_SIZE / SCREEN_WIDTH],
    );

    const scale = previewProgress < 0.25 ? previewScale : finalScale;

    const centerX = SCREEN_WIDTH / 2;
    const centerY = SCREEN_HEIGHT / 2;
    const targetX = targetPosition.x;
    const targetY = targetPosition.y;

    const translateX = interpolate(fly, [0, 1], [0, targetX - centerX]);
    const translateY = interpolate(fly, [0, 1], [0, targetY - centerY]);

    const opacity = interpolate(fly, [0, 0.7, 1], [1, 1, 0]);

    const borderRadius = interpolate(
      Math.max(previewProgress * 4, fly),
      [0, 1],
      [12, 30],
    );

    return {
      transform: [{ translateX }, { translateY }, { scale }],
      opacity,
      borderRadius,
    };
  });

  if (!visible || !imageUri) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.flashOverlay, flashStyle]} />

      <Animated.View style={[styles.imageContainer, imageAnimatedStyle]}>
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          contentFit="cover"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
  },
  imageContainer: {
    position: "absolute",
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    overflow: "hidden",
    boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.1)",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});

export default ScreenshotCaptureAnimation;
