import { GalleryItem } from "@/constants/interface";
import { useTheme } from "@/context/theme-context";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { memo, useEffect } from "react";
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
  const player = useVideoPlayer(item.uri, (nextPlayer) => {
    nextPlayer.loop = true;
    nextPlayer.volume = 1;
    if (isActive && item.mediaType === "video") {
      nextPlayer.play();
    }
  });

  useEffect(() => {
    if (item.mediaType !== "video") {
      return;
    }

    if (isActive) {
      player.play();
      return;
    }

    player.pause();
  }, [isActive, item.mediaType, player]);

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
      {item.mediaType === "video" ? (
        <VideoView
          player={player}
          style={[styles.video, { width, height: contentHeight }]}
          contentFit="contain"
          nativeControls={true}
          allowsFullscreen
          surfaceType="textureView"
        />
      ) : (
        <Image
          source={{ uri: item.uri }}
          style={[styles.image, { width, height: contentHeight }]}
          contentFit="contain"
          cachePolicy="memory-disk"
          recyclingKey={item.id}
          priority="high"
        />
      )}
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
