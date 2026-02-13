import { GalleryItem } from "@/constants/interface";
import { useTheme } from "@/context/theme-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { FC, memo, useCallback, useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { Pressable } from "./themed";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
export const GALLERY_ITEM_SIZE = (width - 50) / 2;

interface RenderGalleryImageProps {
  index: number;
  item: GalleryItem;
  images: GalleryItem[];
  setSelectedStoryIndex: React.Dispatch<React.SetStateAction<number>>;
  setShowStoryModal: React.Dispatch<React.SetStateAction<boolean>>;
}

const RenderGalleryImage: FC<RenderGalleryImageProps> = ({
  item,
  index,
  images,
  setSelectedStoryIndex,
  setShowStoryModal,
}) => {
  const { theme } = useTheme();

  const handlePress = useCallback(() => {
    const imagesJson = JSON.stringify(images);
    router.push({
      pathname: "/gallery-view",
      params: {
        images: imagesJson,
        initialIndex: index.toString(),
      },
    });
  }, [index, images]);

  return (
    <Pressable
      style={[
        styles.imageContainer,
        {
          marginRight: index % 2 === 0 ? 10 : 0,
          backgroundColor: theme.cardBackground,
        },
      ]}
      onPress={handlePress}
    >
      <Image
        source={{ uri: item.uri }}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
        recyclingKey={item.id}
      />
    </Pressable>
  );
};

export default memo(RenderGalleryImage);

const styles = StyleSheet.create({
  imageContainer: {
    width: GALLERY_ITEM_SIZE,
    height: GALLERY_ITEM_SIZE + 100,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 8,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  videoContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  videoIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
