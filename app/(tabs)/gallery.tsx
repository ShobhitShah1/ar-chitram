import { EmptyState } from "@/components/empty-state";
import RenderGalleryImage from "@/components/render-gallery-image";
import { withTheme } from "@/context/theme-wrapper";
import { SafeAreaView, useCommonThemedStyles } from "@/components/themed";
import { FontFamily } from "@/constants/fonts";
import { GalleryItem } from "@/constants/interface";
import { useTheme } from "@/context/theme-context";
import * as MediaLibrary from "expo-media-library";
import React, { useCallback, useEffect, useState } from "react";
import { Dimensions, FlatList, RefreshControl, StyleSheet } from "react-native";

const { width } = Dimensions.get("window");

function GalleryScreen() {
  const { theme } = useTheme();
  const commonStyles = useCommonThemedStyles();
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDownloadedImages = useCallback(async () => {
    try {
      const { status } = await MediaLibrary.getPermissionsAsync();
      if (status !== "granted") {
        setImages([]);
        return;
      }

      const album = await MediaLibrary.getAlbumAsync("Gigglam");
      if (!album) {
        setImages([]);
        return;
      }

      const albumAssets = await MediaLibrary.getAssetsAsync({
        album: album,
        mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
        sortBy: "modificationTime",
        first: 500,
      });

      const uniqueAssets = albumAssets.assets;

      const galleryItems: GalleryItem[] = uniqueAssets.map((asset) => ({
        id: asset.id,
        _id: asset.id,
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        creationTime: asset.creationTime,
        mediaType: (asset.mediaType === "pairedVideo"
          ? "video"
          : asset.mediaType) as "photo" | "video" | "audio" | "unknown",
      }));

      setImages(galleryItems);
    } catch (error) {
      console.error("Error loading images:", error);
      setImages([]);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDownloadedImages();
    setRefreshing(false);
  }, [loadDownloadedImages]);

  useEffect(() => {
    initializeGallery();
  }, []);

  const initializeGallery = useCallback(async () => {
    setLoading(images.length === 0);
    await loadDownloadedImages();
    setLoading(false);
  }, [loadDownloadedImages]);

  const renderItem = useCallback(
    ({ item, index }: { item: GalleryItem; index: number }) => (
      <RenderGalleryImage
        index={index}
        item={item}
        images={images}
        setSelectedStoryIndex={() => {}}
        setShowStoryModal={() => {}}
      />
    ),
    [images],
  );

  const keyExtractor = useCallback((item: GalleryItem) => item.id, []);

  const getItemLayout = useCallback((_data: any, index: number) => {
    const ITEM_HEIGHT = (width - 60) / 2 + 20; // item height + margin
    return {
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * Math.floor(index / 2),
      index,
    };
  }, []);

  return (
    <SafeAreaView style={commonStyles.container}>
      {loading ? (
        <EmptyState showLoading={true} title="Loading images..." />
      ) : images.length === 0 ? (
        <EmptyState
          title="No Downloaded Images"
          description="Download images from rooms to see them here"
        />
      ) : (
        <FlatList
          data={images}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          initialNumToRender={6}
          windowSize={5}
          updateCellsBatchingPeriod={50}
          getItemLayout={getItemLayout}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.accent]}
              progressBackgroundColor={theme.background}
              tintColor={theme.textPrimary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: "#333",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
    fontFamily: FontFamily.medium,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  gridContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 8,
  },
  imageDate: {
    color: "#fff",
    fontSize: 11,
    textAlign: "center",
  },
  emptyButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: FontFamily.semibold,
  },
});

export default withTheme(GalleryScreen);
