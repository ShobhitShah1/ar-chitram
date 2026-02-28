import {
  ic_color_grid,
  ic_patent,
  ic_preview_eye,
  ic_signature,
  ic_upload_home,
} from "@/assets/icons";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

import { VirtualLayer } from "@/store/virtual-creativity-store";
import { CompositePreview } from "./composite-preview";

export type ToolType = "gallery" | "palette" | "pattern" | "stroke" | "preview";

interface BottomBarProps {
  onGallery: () => void;
  onPalette: () => void;
  onPattern: () => void;
  onStroke: () => void;
  onPreview: () => void;
  onPreviewLongPress?: () => void;
  onCompositeRestore?: () => void;
  selectedTool?: ToolType;
  previewBadge?: number;
  mode?: "default" | "single";
  layers: VirtualLayer[];
  showGallery?: boolean;
}

const SOFT_LAYOUT = LinearTransition.springify()
  .mass(1)
  .damping(30)
  .stiffness(260);

const BottomBarComponent: React.FC<BottomBarProps> = ({
  onGallery,
  onPalette,
  onPattern,
  onStroke,
  onPreview,
  onPreviewLongPress,
  onCompositeRestore,
  selectedTool = "gallery",
  previewBadge = 0,
  mode = "default",
  layers,
  showGallery = true,
}) => {
  const { theme, isDark } = useTheme();
  const previewGradientColors = isDark
    ? ["rgba(126, 126, 126, 1)", "rgba(107, 107, 107, 1)"]
    : ["rgba(185, 184, 184, 1)", "rgba(125, 125, 125, 1)"];

  const getIconContainerStyle = (tool: ToolType) => {
    if (tool === "gallery") {
      return {
        backgroundColor: "#1E1E1E", // Dark
      };
    }
    return {
      backgroundColor: isDark ? "#D5D5D5" : "#EBEBEB",
    };
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: "transparent",
          justifyContent: "space-between",
        },
      ]}
      layout={SOFT_LAYOUT}
    >
      {/* Slot 1: Gallery OR Composite Preview */}
      {mode === "single" ? (
        <Animated.View
          key="slot1-preview"
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(140)}
          layout={SOFT_LAYOUT}
        >
          <Pressable onPress={onCompositeRestore} style={styles.btn}>
            <LinearGradient
              colors={previewGradientColors as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.previewGradientBorder}
            >
              <View
                style={[
                  styles.previewContainer,
                  { backgroundColor: theme.background },
                ]}
              >
                <View style={styles.previewContent}>
                  <CompositePreview layers={layers} />
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      ) : showGallery ? (
        <Animated.View
          key="slot1-gallery"
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(140)}
          layout={SOFT_LAYOUT}
        >
          <Pressable onPress={onGallery} style={styles.btn}>
            <View
              style={[styles.iconContainer, getIconContainerStyle("gallery")]}
            >
              <Image
                source={ic_upload_home}
                style={styles.icon}
                contentFit="contain"
                tintColor="#FFFFFF"
              />
            </View>
          </Pressable>
        </Animated.View>
      ) : (
        <Animated.View
          key="slot1-placeholder"
          entering={FadeIn.duration(120)}
          exiting={FadeOut.duration(120)}
          layout={SOFT_LAYOUT}
        >
          <View style={styles.placeholder} />
        </Animated.View>
      )}

      {/* Slot 2: Palette */}
      <Pressable onPress={onPalette} style={styles.btn}>
        <View style={[styles.iconContainer, getIconContainerStyle("palette")]}>
          <Image
            source={ic_color_grid}
            style={styles.icon}
            contentFit="contain"
          />
        </View>
      </Pressable>

      {/* Slot 3: Pattern */}
      <Pressable onPress={onPattern} style={styles.btn}>
        <View style={[styles.iconContainer, getIconContainerStyle("pattern")]}>
          <Image source={ic_patent} style={styles.icon} contentFit="contain" />
        </View>
      </Pressable>

      {/* Slot 4: Stroke (Only in Default Mode, else placeholder) */}
      {mode === "default" ? (
        <Animated.View
          key="slot4-stroke"
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(140)}
          layout={SOFT_LAYOUT}
        >
          <Pressable onPress={onStroke} style={styles.btn}>
            <View
              style={[styles.iconContainer, getIconContainerStyle("stroke")]}
            >
              <Image
                source={ic_signature}
                style={styles.icon}
                contentFit="contain"
              />
            </View>
          </Pressable>
        </Animated.View>
      ) : (
        <Animated.View
          key="slot4-placeholder"
          entering={FadeIn.duration(120)}
          exiting={FadeOut.duration(120)}
          layout={SOFT_LAYOUT}
        >
          <View style={styles.placeholder} />
        </Animated.View>
      )}

      {/* Slot 5: Preview (Only in Default Mode, else placeholder) */}
      {mode === "default" ? (
        <Animated.View
          key="slot5-preview"
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(140)}
          layout={SOFT_LAYOUT}
        >
          <Pressable
            onPress={onPreview}
            onLongPress={onPreviewLongPress}
            style={styles.btn}
          >
            <View style={[styles.iconContainer, getIconContainerStyle("preview")]}>
              <Image source={ic_preview_eye} style={styles.icon} contentFit="contain" />
              {previewBadge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{previewBadge}</Text>
                </View>
              )}
            </View>
          </Pressable>
        </Animated.View>
      ) : (
        <Animated.View
          key="slot5-placeholder"
          entering={FadeIn.duration(120)}
          exiting={FadeOut.duration(120)}
          layout={SOFT_LAYOUT}
        >
          <View style={styles.placeholder} />
        </Animated.View>
      )}
    </Animated.View>
  );
};

export const BottomBar = React.memo(BottomBarComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  btn: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  previewGradientBorder: {
    width: 60,
    height: 60,
    borderRadius: 20,
    padding: 2.5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  previewContainer: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewContent: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  icon: {
    width: 32,
    height: 32,
  },
  badge: {
    position: "absolute",
    top: -13,
    right: -5,
    backgroundColor: "#007AFF", // Blue badge
    borderRadius: 500,
    width: 23,
    height: 23,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: FontFamily.bold,
  },
  placeholder: {
    width: 60,
    height: 60,
  },
});
