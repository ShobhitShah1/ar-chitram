import { ArtGalleryGrid } from "@/components/art-gallery-grid";
import { CategoryChips } from "@/components/category-chips";
import { EmptyState } from "@/components/empty-state";
import ImageGrid from "@/components/image-grid";
import TabsHeader from "@/components/tabs-header";
import { useCommonThemedStyles } from "@/components/themed";
import { GalleryItem } from "@/constants/interface";
import {
  ArtCaptureGroup,
  getLocalArtCaptureGroups,
} from "@/features/gallery/services/local-gallery-service";
import { useVirtualCreativityStore } from "@/features/virtual-creativity/store/virtual-creativity-store";
import { useShuffleStore } from "@/store/shuffle-store";
import * as MediaLibrary from "expo-media-library";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Animated from "react-native-reanimated";
import { shuffleItemsSeeded } from "../../utils/shuffle";

const GALLERY_FILTERS = ["Exhibition", "Art"] as const;

type GalleryFilter = (typeof GALLERY_FILTERS)[number];

function GalleryScreen() {
  const commonStyles = useCommonThemedStyles();
  const setDrawingHistorySnapshots = useVirtualCreativityStore(
    (state) => state.setDrawingHistorySnapshots,
  );
  const toggleShuffle = useShuffleStore((state) => state.toggleShuffle);
  const handleToggleShuffle = useCallback(
    () => toggleShuffle("gallery"),
    [toggleShuffle],
  );
  const shuffleSeed = useShuffleStore(
    (state) => (state.shuffleSeeds && state.shuffleSeeds["gallery"]) || 0,
  );
  const [selectedFilter, setSelectedFilter] =
    useState<GalleryFilter>("Exhibition");
  const [exhibitionImages, setExhibitionImages] = useState<GalleryItem[]>([]);
  const [artGroups, setArtGroups] = useState<ArtCaptureGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadExhibitionImages = useCallback(async () => {
    try {
      const { status, canAskAgain } = await MediaLibrary.getPermissionsAsync();
      if (status !== "granted") {
        if (canAskAgain) {
          const { status: nextStatus } =
            await MediaLibrary.requestPermissionsAsync();
          if (nextStatus !== "granted") {
            setExhibitionImages([]);
            return;
          }
        } else {
          setExhibitionImages([]);
          return;
        }
      }

      const album = await MediaLibrary.getAlbumAsync("ArChitram");
      if (!album) {
        setExhibitionImages([]);
        return;
      }

      const albumAssets = await MediaLibrary.getAssetsAsync({
        album,
        mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
        sortBy: "modificationTime",
        first: 500,
      });

      const nextImages: GalleryItem[] = albumAssets.assets.map((asset) => ({
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

      setExhibitionImages(nextImages);
    } catch (error) {
      console.error("Error loading exhibition gallery:", error);
      setExhibitionImages([]);
    }
  }, []);

  const loadArtGroups = useCallback(async () => {
    try {
      const nextGroups = await getLocalArtCaptureGroups();
      setArtGroups(nextGroups);
    } catch (error) {
      console.error("Error loading art gallery:", error);
      setArtGroups([]);
    }
  }, []);

  const loadGalleryData = useCallback(async () => {
    await Promise.all([loadExhibitionImages(), loadArtGroups()]);
  }, [loadArtGroups, loadExhibitionImages]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGalleryData();
    setRefreshing(false);
  }, [loadGalleryData]);

  const initializeGallery = useCallback(async () => {
    setLoading(true);
    await loadGalleryData();
    setLoading(false);
  }, [loadGalleryData]);

  useEffect(() => {
    void initializeGallery();
  }, [initializeGallery]);

  useFocusEffect(
    useCallback(() => {
      void loadGalleryData();
    }, [loadGalleryData]),
  );

  const handleArtGroupPress = useCallback(
    (group: ArtCaptureGroup) => {
      const orderedSnapshots = [...group.captures]
        .sort((left, right) => left.createdAt - right.createdAt)
        .map((capture) => ({
          id: capture.id,
          uri: capture.uri,
          timestamp: capture.createdAt,
        }));
      const imageUri = orderedSnapshots[0]?.uri ?? group.coverUri;

      setDrawingHistorySnapshots(orderedSnapshots);
      router.push({
        pathname: "/drawing/guide",
        params: {
          imageUri,
          originalImageUri: group.originalUri ?? imageUri,
        },
      });
    },
    [setDrawingHistorySnapshots],
  );

  const handleExhibitionPress = useCallback(
    (id: string) => {
      const index = exhibitionImages.findIndex((image) => image.id === id);
      if (index === -1) {
        return;
      }

      router.push({
        pathname: "/gallery-view",
        params: {
          images: JSON.stringify(exhibitionImages),
          initialIndex: index.toString(),
        },
      });
    },
    [exhibitionImages],
  );

  const displayExhibitionImages = useMemo(() => {
    const raw = exhibitionImages.map((image) => ({
      id: image.id,
      image: image.uri,
      isPremium: false,
    }));

    return shuffleItemsSeeded(raw, shuffleSeed);
  }, [exhibitionImages, shuffleSeed]);

  const displayArtGroups = useMemo(() => {
    return shuffleItemsSeeded(artGroups, shuffleSeed);
  }, [artGroups, shuffleSeed]);

  const isExhibitionFilter = selectedFilter === "Exhibition";

  const exhibitionEmptyState = (
    <EmptyState
      title="No Saved Media"
      description="Photos and videos saved by ArChitram appear here automatically."
    />
  );

  const artEmptyState = (
    <EmptyState
      title="No Art Yet"
      description="Virtual Creativity captures you continue with will appear here."
    />
  );

  return (
    <Animated.View style={commonStyles.container}>
      <TabsHeader
        isShuffle
        screenId="gallery"
        onShufflePress={handleToggleShuffle}
      />
      <CategoryChips
        items={[...GALLERY_FILTERS]}
        selected={selectedFilter}
        onSelect={(item) => setSelectedFilter(item as GalleryFilter)}
      />

      {loading ? (
        <EmptyState showLoading={true} title="Loading gallery..." />
      ) : isExhibitionFilter ? (
        <ImageGrid
          numColumns={2}
          data={displayExhibitionImages}
          onPress={(item) => handleExhibitionPress(String(item.id))}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={exhibitionEmptyState}
        />
      ) : (
        <ArtGalleryGrid
          data={displayArtGroups}
          onPress={handleArtGroupPress}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={artEmptyState}
        />
      )}
    </Animated.View>
  );
}

export default GalleryScreen;
