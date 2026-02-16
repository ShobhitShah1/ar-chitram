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
import PrimaryButton from "@/components/ui/primary-button";

interface TopBarProps {
  onUndo: () => void;
  onRedo: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  onResize?: () => void;
  onDelete?: () => void;
  onNext?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  hasSelection?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  onUndo,
  onRedo,
  onBringToFront,
  onSendToBack,
  onResize,
  onDelete,
  onNext,
  canUndo = false,
  canRedo = false,
  hasSelection = false,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.container}>
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
            !hasSelection && styles.disabled,
            pressed && styles.pressed,
            { backgroundColor: isDark ? "#D5D5D5" : "#EBEBEB" },
          ]}
          disabled={!hasSelection}
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
            !hasSelection && styles.disabled,
            pressed && styles.pressed,
            { backgroundColor: isDark ? "#D5D5D5" : "#EBEBEB" },
          ]}
          disabled={!hasSelection}
        >
          <Image
            source={ic_backface}
            style={styles.icon}
            contentFit="contain"
          />
        </Pressable>

        {/* Resize / Zoom */}
        <Pressable
          onPress={onResize}
          style={({ pressed }) => [
            styles.btn,
            !hasSelection && styles.disabled,
            pressed && styles.pressed,
            { backgroundColor: isDark ? "#D5D5D5" : "#EBEBEB" },
          ]}
          disabled={!hasSelection}
        >
          <Image source={ic_zoom} style={styles.icon} contentFit="contain" />
        </Pressable>

        {/* Delete */}
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [
            styles.btn,
            !hasSelection && styles.disabled,
            pressed && styles.pressed,
            { backgroundColor: isDark ? "#D5D5D5" : "#EBEBEB" },
          ]}
          disabled={!hasSelection}
        >
          <Image source={ic_delete} style={styles.icon} contentFit="contain" />
        </Pressable>
      </View>

      {/* Next Button */}
      {onNext && (
        <PrimaryButton
          title="Next"
          onPress={onNext}
          style={styles.nextBtn}
          textStyle={styles.nextText}
          colors={theme.drawingButton as any}
        />
      )}
    </View>
  );
};

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
