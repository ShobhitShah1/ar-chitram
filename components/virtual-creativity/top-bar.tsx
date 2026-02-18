import {
  ic_backface,
  ic_delete,
  ic_frontface,
  ic_redo,
  ic_undo,
  ic_zoom,
} from "@/assets/icons";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import PrimaryButton from "@/components/ui/primary-button";

interface TopBarProps {
  onUndo: () => void;
  onRedo: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  onZoomToggle?: () => void;
  onZoomReset?: () => void;
  onDelete?: () => void;
  onNext?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  hasSelection?: boolean;
  canReorder?: boolean;
  canDelete?: boolean;
  isZoomActive?: boolean;
  hideNext?: boolean;
}

const SOFT_LAYOUT = LinearTransition.springify()
  .mass(1)
  .damping(30)
  .stiffness(260);

const TopBarComponent: React.FC<TopBarProps> = ({
  onUndo,
  onRedo,
  onBringToFront,
  onSendToBack,
  onZoomToggle,
  onZoomReset,
  onDelete,
  onNext,
  canUndo = false,
  canRedo = false,
  hasSelection = false,
  canReorder = false,
  canDelete = hasSelection,
  isZoomActive = false,
  hideNext = false,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <Animated.View style={styles.container} layout={SOFT_LAYOUT}>
      <View style={styles.toolsContainer}>
        {/* Undo */}
        <Pressable
          onPress={onUndo}
          style={({ pressed }) => [
            styles.btn,
            !canUndo && styles.disabled,
            pressed && styles.pressed,
            { backgroundColor: isDark ? "#D5D5D5" : "#EBEBEB" },
          ]}
          disabled={!canUndo}
        >
          <Image source={ic_undo} style={styles.icon} contentFit="contain" />
        </Pressable>

        {/* Redo */}
        <Pressable
          onPress={onRedo}
          style={({ pressed }) => [
            styles.btn,
            !canRedo && styles.disabled,
            pressed && styles.pressed,
            { backgroundColor: isDark ? "#D5D5D5" : "#EBEBEB" },
          ]}
          disabled={!canRedo}
        >
          <Image
            source={ic_undo}
            contentFit="contain"
            style={[styles.icon, { transform: [{ scaleX: -1 }] }]}
          />
        </Pressable>

        {/* Bring to Front (was Layers) */}
        <Pressable
          onPress={onBringToFront}
          style={({ pressed }) => [
            styles.btn,
            !canReorder && styles.disabled,
            pressed && styles.pressed,
            { backgroundColor: isDark ? "#D5D5D5" : "#EBEBEB" },
          ]}
          disabled={!canReorder}
        >
          <Image
            source={ic_frontface}
            style={styles.icon}
            contentFit="contain"
          />
        </Pressable>

        {/* Send to Back (was Copy) */}
        <Pressable
          onPress={onSendToBack}
          style={({ pressed }) => [
            styles.btn,
            !canReorder && styles.disabled,
            pressed && styles.pressed,
            { backgroundColor: isDark ? "#D5D5D5" : "#EBEBEB" },
          ]}
          disabled={!canReorder}
        >
          <Image
            source={ic_backface}
            style={styles.icon}
            contentFit="contain"
          />
        </Pressable>

        {/* Zoom Toggle */}
        <Pressable
          onPress={onZoomToggle}
          onLongPress={onZoomReset}
          style={({ pressed }) => [
            styles.btn,
            isZoomActive && styles.activeBtn,
            pressed && styles.pressed,
            {
              backgroundColor: isZoomActive
                ? theme.accent
                : isDark
                  ? "#D5D5D5"
                  : "#EBEBEB",
            },
          ]}
        >
          <Image
            source={ic_zoom}
            style={[styles.icon, isZoomActive && { tintColor: "#fff" }]}
            contentFit="contain"
          />
        </Pressable>

        {/* Delete */}
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [
            styles.btn,
            !canDelete && styles.disabled,
            pressed && styles.pressed,
            { backgroundColor: isDark ? "#D5D5D5" : "#EBEBEB" },
          ]}
          disabled={!canDelete}
        >
          <Image source={ic_delete} style={styles.icon} contentFit="contain" />
        </Pressable>
      </View>

      {/* Next Button */}
      {onNext && !hideNext && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(150)}
          layout={SOFT_LAYOUT}
        >
          <PrimaryButton
            title="Next"
            onPress={onNext}
            style={styles.nextBtn}
            textStyle={styles.nextText}
            colors={theme.drawingButton as any}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
};

export const TopBar = React.memo(TopBarComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toolsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  activeBtn: {
    // Style handled inline via backgroundColor for now
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.3,
  },
  icon: {
    width: 20,
    height: 20,
  },
  nextBtn: {
    height: 40,
    minWidth: 70,
    borderRadius: 20,
  },
  nextText: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
  },
});
