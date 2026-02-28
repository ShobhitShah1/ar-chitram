import { FontFamily } from "@/constants/fonts";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../context/theme-context";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface StoryIconProps {
  image: string;
  title: string;
  onPress?: () => void;
}

export const StoryIcon: React.FC<StoryIconProps> = ({
  image,
  title,
  onPress,
}) => {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  console.log(image);
  const gradientColors = isDark
    ? ["rgba(126, 126, 126, 1)", "rgba(107, 107, 107, 1)"]
    : ["rgba(185, 184, 184, 1)", "rgba(125, 125, 125, 1)"];

  const handlePressIn = () => {
    scale.value = withSpring(0.95, {
      damping: 15,
      stiffness: 150,
      mass: 1,
      energyThreshold: 0.001,
    });
    opacity.value = withTiming(0.8);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 150,
      mass: 1,
      energyThreshold: 0.001,
    });
    opacity.value = withTiming(1);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      style={[styles.container, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <LinearGradient
        colors={gradientColors as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}
      >
        <View
          style={[styles.iconContainer, { backgroundColor: theme.background }]}
        >
          <Image
            source={{ uri: image }}
            style={styles.icon}
            contentFit="cover"
          />
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: 72,
  },
  gradientBorder: {
    width: 70,
    height: 70,
    padding: 2.5,
    borderRadius: 20,
    marginBottom: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  icon: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  title: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
    fontFamily: FontFamily.medium,
    lineHeight: 12,
    maxWidth: 64,
  },
});
