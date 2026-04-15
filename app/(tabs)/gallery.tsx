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
  getLocalRecordingReferences,
} from "@/features/gallery/services/local-gallery-service";
import { useVirtualCreativityStore } from "@/features/virtual-creativity/store/virtual-creativity-store";
import { useShuffleStore } from "@/store/shuffle-store";
import * as MediaLibrary from "expo-media-library";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Animated from "react-native-reanimated";
import { shuffleItemsSeeded } from "../../utils/shuffle";

const GALLERY_FILTERS = ["Exhibition", "Art", "Recording"] as const;

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
  const [recordingItems, setRecordingItems] = useState<GalleryItem[]>([]);
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
        mediaType: [MediaLibrary.MediaType.photo],
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

  const loadRecordingItems = useCallback(async () => {
    try {
      const records = await getLocalRecordingReferences();
      setRecordingItems(
        records.map((record) => ({
          id: record.id,
          _id: record.id,
          uri: record.localUri,
          width: 1080,
          height: 1920,
          creationTime: record.createdAt,
          mediaType: "video",
          fileName: record.fileName,
          originalUri: record.originalUri,
          sourceImageName: record.sourceImageName,
        })),
      );
    } catch (error) {
      console.error("Error loading recordings gallery:", error);
      setRecordingItems([]);
    }
  }, []);

  const loadGalleryData = useCallback(async () => {
    await Promise.all([
      loadExhibitionImages(),
      loadArtGroups(),
      loadRecordingItems(),
    ]);
  }, [loadArtGroups, loadExhibitionImages, loadRecordingItems]);

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
      // Sort captures DESCENDING to show newest first
      const orderedSnapshots = [...group.captures]
        .sort((left, right) => right.createdAt - left.createdAt)
        .map((capture) => ({
          id: capture.id,
          uri: capture.uri,
          timestamp: capture.createdAt,
        }));

      const imageUri = orderedSnapshots[0]?.uri ?? group.coverUri;

      setDrawingHistorySnapshots(orderedSnapshots);

      router.push({
        pathname: "/drawing/preview",
        params: {
          imageUri,
          originalImageUri: group.originalUri ?? imageUri,
        },
      });
    },
    [setDrawingHistorySnapshots],
  );

  const handleGalleryItemsPress = useCallback(
    (items: GalleryItem[], id: string) => {
      const index = items.findIndex((image) => image.id === id);
      if (index === -1) {
        return;
      }

      router.push({
        pathname: "/gallery-view",
        params: {
          images: JSON.stringify(items),
          initialIndex: index.toString(),
        },
      });
    },
    [],
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
    // Ensure newest captures are first in the list
    const sorted = [...artGroups].sort((a, b) => b.createdAt - a.createdAt);
    if (shuffleSeed === 0) return sorted;
    return shuffleItemsSeeded(sorted, shuffleSeed);
  }, [artGroups, shuffleSeed]);

  const displayRecordingItems = useMemo(
    () =>
      shuffleItemsSeeded(
        recordingItems.map((item) => ({
          id: item.id,
          image: item.uri,
          mediaType: item.mediaType,
        })),
        shuffleSeed,
      ),
    [recordingItems, shuffleSeed],
  );

  const isExhibitionFilter = selectedFilter === "Exhibition";
  const isRecordingFilter = selectedFilter === "Recording";

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

  const recordingEmptyState = (
    <EmptyState
      title="No Recordings Yet"
      description="Drawing screen recordings will appear here automatically."
    />
  );

  return (
    <Animated.View style={commonStyles.container}>
      <TabsHeader
        screenId="gallery"
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
          onPress={(item) =>
            handleGalleryItemsPress(exhibitionImages, String(item.id))
          }
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={exhibitionEmptyState}
        />
      ) : isRecordingFilter ? (
        <ImageGrid
          numColumns={2}
          data={displayRecordingItems}
          onPress={(item) =>
            handleGalleryItemsPress(recordingItems, String(item.id))
          }
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={recordingEmptyState}
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
