import {
  ic_color_grid,
  ic_patent,
  ic_preview_eye,
  ic_signature,
  ic_upload_home,
} from "@/assets/icons";
import { useTheme } from "@/context/theme-context";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type ToolType = "gallery" | "palette" | "pattern" | "stroke" | "preview";

interface BottomBarProps {
  onGallery: () => void;
  onPalette: () => void;
  onPattern: () => void;
  onStroke: () => void;
  onPreview: () => void;
  selectedTool?: ToolType;
  previewBadge?: number;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  onGallery,
  onPalette,
  onPattern,
  onStroke,
  onPreview,
  selectedTool = "gallery",
  previewBadge = 0,
}) => {
  const { theme, isDark } = useTheme();

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
    <View style={[styles.container, { backgroundColor: "transparent" }]}>
      {/* Gallery (Upload) */}
      <Pressable onPress={onGallery} style={styles.btn}>
        <View style={[styles.iconContainer, getIconContainerStyle("gallery")]}>
          <Image
            source={ic_upload_home}
            style={styles.icon}
            contentFit="contain"
            tintColor="#FFFFFF"
          />
        </View>
      </Pressable>

      {/* Palette */}
      <Pressable onPress={onPalette} style={styles.btn}>
        <View style={[styles.iconContainer, getIconContainerStyle("palette")]}>
          <Image
            source={ic_color_grid}
            style={styles.icon}
            contentFit="contain"
          />
        </View>
      </Pressable>

      {/* Pattern */}
      <Pressable onPress={onPattern} style={styles.btn}>
        <View style={[styles.iconContainer, getIconContainerStyle("pattern")]}>
          <Image source={ic_patent} style={styles.icon} contentFit="contain" />
        </View>
      </Pressable>

      {/* Stroke */}
      <Pressable onPress={onStroke} style={styles.btn}>
        <View style={[styles.iconContainer, getIconContainerStyle("stroke")]}>
          <Image
            source={ic_signature}
            style={styles.icon}
            contentFit="contain"
          />
        </View>
      </Pressable>

      {/* Preview */}
      <Pressable onPress={onPreview} style={styles.btn}>
        <View style={[styles.iconContainer, getIconContainerStyle("preview")]}>
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
  icon: {
    width: 32,
    height: 32,
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#007AFF", // Blue badge
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
});
