import { GalleryItem } from "@/constants/interface";
import { useTheme } from "@/context/theme-context";
import { Image } from "expo-image";
import React, { memo, useEffect, useRef } from "react";
import { Dimensions, StyleSheet, View } from "react-native";

const { width, height } = Dimensions.get("screen");

interface GalleryViewItemProps {
  item: GalleryItem;
  isActive: boolean;
  contentHeight: number;
}

/**
 * Gallery View Item Component
 *
 * Displays a single image or video in the gallery viewer.
 * Optimized for smooth scrolling without flickering.
 */
const GalleryViewItem: React.FC<GalleryViewItemProps> = ({
  item,
  isActive,
  contentHeight,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height: contentHeight,
          backgroundColor: theme.background,
        },
      ]}
    >
      <Image
        source={{ uri: item.uri }}
        style={[styles.image, { width, height: contentHeight }]}
        contentFit="contain"
        cachePolicy="memory-disk"
        recyclingKey={item.id}
        priority="high"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    flex: 1,
  },
  video: {
    flex: 1,
  },
});

export default memo(GalleryViewItem);
