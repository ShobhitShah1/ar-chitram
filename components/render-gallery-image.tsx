import { ic_image_audio_download } from "@/assets/icons";
import { GalleryItem } from "@/constants/interface";
import { useTheme } from "@/context/theme-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { FC, memo, useCallback } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { Pressable } from "./themed";

const { width } = Dimensions.get("window");
export const GALLERY_ITEM_SIZE = (width - 50) / 2;

interface RenderGalleryImageProps {
  index: number;
  item: GalleryItem;
  images: GalleryItem[];
  setSelectedStoryIndex: React.Dispatch<React.SetStateAction<number>>;
  setShowStoryModal: React.Dispatch<React.SetStateAction<boolean>>;
}

// Video Preview Component for gallery thumbnails
const VideoPreview = memo(({ uri, size }: { uri: string; size: number }) => {
  const player = useVideoPlayer(uri, (player) => {
    player.loop = true;
    player.volume = 0; // Muted
    player.play();
  });

  return (
    <View pointerEvents="none" style={{ width: "100%", height: "100%" }}>
      <VideoView
        pointerEvents="none"
        player={player}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        nativeControls={false}
        surfaceType="textureView"
      />
    </View>
  );
});

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
  }, [images, index]);

  return (
    <View
      style={[
        styles.imageContainer,
        {
          marginRight: index % 2 === 0 ? 10 : 0,
          backgroundColor: theme.cardBackground,
        },
      ]}
    >
      {item.mediaType === "video" ? (
        <View pointerEvents="none" style={styles.videoContainer}>
          <VideoPreview uri={item.uri} size={GALLERY_ITEM_SIZE} />
          <View pointerEvents="none" style={styles.videoIndicator}>
            <Image
              contentFit="contain"
              source={ic_image_audio_download}
              style={{ width: 18, height: 18, tintColor: "white" }}
            />
          </View>
        </View>
      ) : (
        <Image
          source={{ uri: item.uri }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          recyclingKey={item.id}
        />
      )}
      <Pressable style={styles.tapOverlay} onPress={handlePress} />
    </View>
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
    borderRadius: 10,
    padding: 8,
  },
  tapOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
  },
});
