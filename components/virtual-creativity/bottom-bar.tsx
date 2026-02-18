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
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
}

export const BottomBar: React.FC<BottomBarProps> = ({
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
}) => {
  const { theme, isDark } = useTheme();

  // Calculate total paths length for key to force re-render on drawing updates
  const totalPaths = layers.reduce(
    (acc, layer) => acc + (layer.paths?.length || 0),
    0,
  );

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
    <View
      style={[
        styles.container,
        {
          backgroundColor: "transparent",
          justifyContent: "space-between",
        },
      ]}
    >
      {/* Slot 1: Gallery OR Composite Preview */}
      {mode === "single" ? (
        <Pressable onPress={onCompositeRestore} style={styles.btn}>
          <View style={[styles.previewContainer]}>
            <CompositePreview
              layers={layers}
              key={`composite-${totalPaths}-${layers.length}`}
            />
          </View>
        </Pressable>
      ) : (
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
        <Pressable onPress={onStroke} style={styles.btn}>
          <View style={[styles.iconContainer, getIconContainerStyle("stroke")]}>
            <Image
              source={ic_signature}
              style={styles.icon}
              contentFit="contain"
            />
          </View>
        </Pressable>
      ) : (
        <View style={styles.placeholder} />
      )}

      {/* Slot 5: Preview (Only in Default Mode, else placeholder) */}
      {mode === "default" ? (
        <Pressable
          onPress={onPreview}
          onLongPress={onPreviewLongPress}
          style={styles.btn}
        >
          <View
            style={[styles.iconContainer, getIconContainerStyle("preview")]}
          >
            <Image
              source={ic_preview_eye}
              style={styles.icon}
              contentFit="contain"
            />
            {previewBadge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{previewBadge}</Text>
              </View>
            )}
          </View>
        </Pressable>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  btn: {
    alignItems: "center",
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  previewContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#007AFF",
    backgroundColor: "#fff",
  },
  previewImage: {
    width: "100%",
    height: "100%",
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
  },
});
