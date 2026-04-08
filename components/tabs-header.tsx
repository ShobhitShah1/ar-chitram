import { StyleSheet, Text, View } from "react-native";
import React, { useEffect } from "react";
import { Pressable } from "./themed";
import { Image } from "expo-image";
import { ic_setting, ic_suffel, ic_upload_home } from "@/assets/icons";
import { router } from "expo-router";
import { useTheme } from "@/context/theme-context";
import { FontFamily } from "@/constants/fonts";
import { useShuffleStore } from "@/store/shuffle-store";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedImage = Animated.createAnimatedComponent(Image);

interface Props {
  isShuffle?: boolean;
  screenId?: string;
  onUploadPress?: () => void;
  onShufflePress?: () => void;
}

const TabsHeader = ({
  onUploadPress,
  isShuffle = false,
  screenId = "default",
  onShufflePress,
}: Props) => {
  const { theme } = useTheme();
  const shuffleSeed = useShuffleStore(
    (state) => (state.shuffleSeeds && state.shuffleSeeds[screenId]) || 0,
  );
  const isShuffleActive = shuffleSeed > 0;

  const rotation = useSharedValue(0);
  const activeProgress = useSharedValue(isShuffleActive ? 1 : 0);

  useEffect(() => {
    activeProgress.value = withTiming(isShuffleActive ? 1 : 0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [isShuffleActive]);

  const handleShufflePress = () => {
    rotation.value = withTiming(rotation.value + 360, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
    onShufflePress?.();
  };

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
    tintColor: interpolateColor(
      activeProgress.value,
      [0, 1],
      [theme.textPrimary, "#FFFFFF"],
    ) as any,
  }));

  const animatedGradientStyle = useAnimatedStyle(() => ({
    opacity: activeProgress.value,
  }));

  const renderShuffleButton = () => {
    if (!isShuffle) return null;

    return (
      <View style={styles.iconButtonWrapper}>
        <Animated.View style={[StyleSheet.absoluteFill, animatedGradientStyle]}>
          <LinearGradient
            colors={theme.drawingButton as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Pressable onPress={handleShufflePress} style={styles.pressable}>
          <AnimatedImage
            contentFit="contain"
            source={ic_suffel}
            style={[styles.iconSmall, animatedIconStyle]}
          />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.headerContainer}>
      <Text style={[styles.ArChitramText, { color: theme.textPrimary }]}>
        AR Chitram
      </Text>

      <View style={styles.rightContainer}>
        {renderShuffleButton()}

        {onUploadPress && (
          <Pressable onPress={onUploadPress}>
            <Image
              contentFit="contain"
              source={ic_upload_home}
              style={[styles.iconMedium]}
            />
          </Pressable>
        )}

        {!onUploadPress && !isShuffle && (
          <Pressable onPress={() => router.push("/other/new-setting")}>
            <Image
              contentFit="contain"
              source={ic_setting}
              style={[styles.iconSmall]}
            />
          </Pressable>
        )}

        {screenId === "home" && (
          <Pressable onPress={() => router.push("/other/new-setting")}>
            <Image
              contentFit="contain"
              source={ic_setting}
              style={[styles.iconSmall]}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
};

export default TabsHeader;

const styles = StyleSheet.create({
  headerContainer: {
    marginHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 5,
  },
  rightContainer: {
    gap: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  ArChitramText: {
    fontFamily: FontFamily.galada,
    fontSize: 23,
  },
  iconMedium: {
    width: 30,
    height: 30,
    bottom: 2,
  },
  iconSmall: {
    width: 23,
    height: 23,
  },
  iconButtonWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  pressable: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});
