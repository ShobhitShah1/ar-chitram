import { ic_customize_home, ic_plus } from "@/assets/icons";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Pressable, Text } from "./themed";
import { Image } from "expo-image";

interface TabItemProps {
  label: string;
  imageSource: number;
  isFocused: boolean;
  onPress: () => void;
  isCenter?: boolean;
  customSize?: number;
}

const AnimatedImage = Animated.createAnimatedComponent(Image);

const TabItem: React.FC<TabItemProps> = memo(
  ({
    label,
    isFocused,
    onPress,
    imageSource,
    isCenter = false,
    customSize = 35,
  }) => {
    const { theme, isDark } = useTheme();
    const bubbleScale = useSharedValue(0);
    const bubbleOpacity = useSharedValue(0);
    const iconTranslateY = useSharedValue(0);

    useEffect(() => {
      "worklet";

      const config = {
        duration: 200,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      };

      if (isFocused) {
        bubbleOpacity.value = withTiming(1, config);
        bubbleScale.value = withTiming(1, config);
        iconTranslateY.value = withTiming(-23, config);
      } else {
        iconTranslateY.value = withTiming(0, config);
        bubbleScale.value = withTiming(0, config);
        bubbleOpacity.value = withTiming(0, config);
      }
    }, [isFocused]);

    const bubbleStyle = useAnimatedStyle(() => {
      "worklet";
      return {
        transform: [{ scale: bubbleScale.value }],
        opacity: bubbleOpacity.value,
      };
    });

    const iconStyle = useAnimatedStyle(() => {
      "worklet";
      return {
        transform: [{ translateY: iconTranslateY.value }],
      };
    });

    const iconSize = useAnimatedStyle(() => {
      "worklet";
      return {
        width: withTiming(isFocused ? customSize : customSize),
        height: withTiming(isFocused ? customSize : customSize),
      };
    });

    return (
      <Pressable onPress={onPress} style={styles.tabItem}>
        <Animated.View
          style={[
            styles.bubbleBackground,
            !isDark && { boxShadow: "0px 2px 5px 0px rgba(0, 0, 0, 0.8)" },
            bubbleStyle,
          ]}
        >
          <LinearGradient
            colors={
              isCenter && isDark
                ? (theme.centerTabBubbleGradient as [
                    string,
                    string,
                    ...string[],
                  ])
                : (theme.tabBubbleGradient as [string, string, ...string[]])
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBubble}
          />
        </Animated.View>

        <Animated.View style={[styles.iconContainer, iconStyle]}>
          <AnimatedImage
            source={isCenter && isFocused ? ic_customize_home : imageSource}
            tintColor={isFocused && isCenter && !isDark ? "#FFFFFF" : undefined}
            style={iconSize}
            contentFit="contain"
          />
        </Animated.View>

        {isFocused && (
          <Text
            style={[
              styles.tabLabel,
              { color: theme.textPrimary, fontSize: 12.5 },
            ]}
          >
            {label}
          </Text>
        )}
      </Pressable>
    );
  },
);

export default TabItem;

const styles = StyleSheet.create({
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    height: 50,
    position: "relative",
  },
  bubbleBackground: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    top: -30,
    alignSelf: "center",
  },
  gradientBubble: {
    width: "100%",
    height: "100%",
    borderRadius: 25,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    position: "relative",
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: FontFamily.semibold,
    textAlign: "center",
    color: "#000000",
    top: -7,
  },
  lottieFullFill: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "150%",
    height: "150%",
    // Offset by 0.75*containerSize to center, container defaults to 50, so -37.5. Update if parent size changes.
    transform: [{ translateX: -37.5 }, { translateY: -37.5 }],
    zIndex: 999999,
    pointerEvents: "none",
  },
});
