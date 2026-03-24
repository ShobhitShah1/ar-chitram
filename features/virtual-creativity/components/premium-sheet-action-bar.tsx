import { ic_black_diamond, ic_play } from "@/assets/icons";
import { PremiumChoiceButton } from "@/components/premium-choice-button";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface PremiumSheetActionBarProps {
  doneDisabled?: boolean;
  doneLabel: string;
  onBuyPress: () => void;
  onDone: () => void;
  onWatchAdPress: () => void;
  premiumPriceLabel?: string;
  showPremiumActions: boolean;
  buyDisabled?: boolean;
  watchAdDisabled?: boolean;
}

const AnimatedView = Animated.createAnimatedComponent(View);
const SPLIT_GAP = 10;

export const PremiumSheetActionBar: React.FC<PremiumSheetActionBarProps> = ({
  doneDisabled = false,
  doneLabel,
  onBuyPress,
  onDone,
  onWatchAdPress,
  premiumPriceLabel,
  showPremiumActions,
  buyDisabled = false,
  watchAdDisabled = false,
}) => {
  const { theme } = useTheme();
  const [frameWidth, setFrameWidth] = React.useState(0);
  const progress = useSharedValue(showPremiumActions ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(showPremiumActions ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, showPremiumActions]);

  const doneGradientColors = (
    theme.drawingButton?.length ? theme.drawingButton : ["#3E3E3E", "#232323"]
  ) as [string, string, ...string[]];
  const splitTargetWidth = frameWidth > 0 ? (frameWidth - SPLIT_GAP) / 2 : 0;

  const singleStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 0.992]) }],
  }));

  const watchStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.2, 1], [0, 0.15, 1]),
    width: interpolate(progress.value, [0, 1], [frameWidth, splitTargetWidth]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.985, 1]) }],
  }));

  const buyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.2, 1], [0, 0.15, 1]),
    width: interpolate(progress.value, [0, 1], [frameWidth, splitTargetWidth]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.985, 1]) }],
  }));

  return (
    <View
      style={styles.frame}
      onLayout={(event) => {
        setFrameWidth(event.nativeEvent.layout.width);
      }}
    >
      <AnimatedView
        pointerEvents={showPremiumActions ? "none" : "auto"}
        style={[styles.absoluteFill, singleStyle]}
      >
        <Pressable
          onPress={onDone}
          disabled={doneDisabled}
          style={({ pressed }) => [
            styles.donePressable,
            pressed && !doneDisabled ? styles.donePressed : null,
            doneDisabled ? styles.doneDisabled : null,
          ]}
        >
          <LinearGradient
            colors={doneGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.doneButton}
          >
            <Text style={styles.doneText}>{doneLabel}</Text>
          </LinearGradient>
        </Pressable>
      </AnimatedView>

      <AnimatedView
        pointerEvents={showPremiumActions ? "auto" : "none"}
        style={styles.splitLayer}
      >
        <AnimatedView
          style={[styles.splitHalfWrap, styles.splitHalfLeft, watchStyle]}
        >
          <PremiumChoiceButton
            variant="compact"
            disabled={watchAdDisabled}
            iconSource={ic_play}
            label="WATCH AD"
            detail="One use"
            pillLabel="AD"
            colors={["#1DDFD7", "#1539FF", "#F006FF"]}
            labelColor="#F9F9F9"
            accentTextColor="#F9F9F9"
            pillBackgroundColor="rgba(5, 5, 5, 0.55)"
            pillTextColor="#F9F9F9"
            onPress={onWatchAdPress}
            style={styles.splitButtonTouch}
          />
        </AnimatedView>

        <AnimatedView
          style={[styles.splitHalfWrap, styles.splitHalfRight, buyStyle]}
        >
          <PremiumChoiceButton
            variant="compact"
            disabled={buyDisabled}
            iconSource={ic_black_diamond}
            label="BUY"
            detail="Unlock"
            pillLabel={premiumPriceLabel ?? ""}
            colors={["#E7B901", "#F2D501", "#EC7303"]}
            labelColor="#361D01"
            accentTextColor="#050505"
            pillBackgroundColor="rgba(74, 40, 3, 0.88)"
            pillTextColor="#F9F9F9"
            onPress={onBuyPress}
            style={styles.splitButtonTouch}
          />
        </AnimatedView>
      </AnimatedView>
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    height: 50,
    position: "relative",
  },
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
  },
  splitLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    overflow: "hidden",
  },
  donePressable: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  doneButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  doneText: {
    color: "#FFFFFF",
    fontFamily: FontFamily.semibold,
    fontSize: 15,
  },
  donePressed: {
    opacity: 0.92,
  },
  doneDisabled: {
    opacity: 0.45,
  },
  splitHalfWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
  },
  splitHalfLeft: {
    left: 0,
  },
  splitHalfRight: {
    right: 0,
  },
  splitButtonTouch: {
    flex: 1,
  },
});
