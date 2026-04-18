import { EmptyState } from "@/components/empty-state";
import Header from "@/components/header";
import ImageGrid from "@/components/image-grid";
import {
  Pressable as ThemedPressable,
  View as ThemedView,
} from "@/components/themed";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import {
  useImageSearch,
  type SearchImageItem,
} from "@/features/search/hooks/use-image-search";
import { ImageSelectionModal } from "@/features/virtual-creativity/components/image-selection-modal";
import { OutlinePreviewModal } from "@/features/virtual-creativity/components/outline-preview-modal";
import { createMainImageLayer } from "@/features/virtual-creativity/services/virtual-layer-service";
import { useVirtualCreativityStore } from "@/features/virtual-creativity/store/virtual-creativity-store";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ImageSearchScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [selectedImage, setSelectedImage] = useState<SearchImageItem | null>(
    null,
  );
  const [isSelectionModalVisible, setIsSelectionModalVisible] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [isLoadingSketch, setIsLoadingSketch] = useState(false);

  const resetVirtualCreativity = useVirtualCreativityStore(
    (state) => state.reset,
  );
  const setLayers = useVirtualCreativityStore((state) => state.setLayers);

  const {
    searchQuery,
    handleSearchChange,
    performSearch,
    clearSearch,
    images,
    isLoading,
    isFetching,
    isError,
    hasQuery,
    loadMore,
    hasMore,
    activeQuery,
    modeFilter,
    setModeFilter,
  } = useImageSearch();

  const handleImagePress = useCallback((item: any) => {
    setSelectedImage(item as SearchImageItem);
    setIsSelectionModalVisible(true);
  }, []);

  const handleApplyImage = useCallback(
    (asSketch: boolean) => {
      if (!selectedImage) return;
      setIsSelectionModalVisible(false);

      if (asSketch) {
        setIsPreviewVisible(true);
      } else {
        commitImage(selectedImage.originalUrl);
      }
    },
    [selectedImage],
  );

  const handleConfirmSketch = (uri: string) => {
    setIsPreviewVisible(false);
    commitImage(uri);
  };

  const commitImage = (uri: string) => {
    resetVirtualCreativity();
    setLayers([createMainImageLayer(uri)], "main-image");

    requestAnimationFrame(() => {
      router.push("/virtual-creativity");
    });
  };

  const renderEmpty = () => {
    if (isLoading && images.length === 0) {
      return <EmptyState showLoading title="Searching sources..." />;
    }

    if (isError) {
      return (
        <EmptyState
          title="Unable to load images"
          description="Please check your connection and try again."
        />
      );
    }

    if (hasQuery && images.length === 0 && !isFetching) {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons
            name="search-outline"
            size={56}
            color={theme.textSecondary}
          />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
            No results found
          </Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Try a different search like "space", "flowers", or "mountains"
          </Text>
        </View>
      );
    }

    if (!hasQuery) {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons
            name="image-outline"
            size={64}
            color={theme.textSecondary}
            style={{ opacity: 0.5 }}
          />
          <Text
            style={[
              styles.emptyTitle,
              { color: theme.textPrimary, marginTop: 10 },
            ]}
          >
            Search HD Images
          </Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Type anything to discover photos
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderFooter = () => {
    if (!hasMore || images.length === 0) return <View style={{ height: 40 }} />;

    return (
      <View style={[styles.footerWrap, { paddingBottom: insets.bottom + 20 }]}>
        <ThemedPressable
          onPress={loadMore}
          disabled={isFetching}
          style={styles.loadMorePressable}
        >
          <LinearGradient
            colors={theme.drawingButton as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.loadMoreButton}
          >
            {isFetching ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.loadMoreText}>Load More</Text>
            )}
          </LinearGradient>
        </ThemedPressable>
      </View>
    );
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <Header title="Image Search" />

      {/* Search Bar Row */}
      <View style={styles.searchSection}>
        <ThemedPressable
          onPress={() => inputRef.current?.focus()}
          style={[
            styles.searchBar,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.05)",
              borderColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.08)",
            },
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={theme.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            ref={inputRef}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onSubmitEditing={performSearch}
            placeholder="Search images..."
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.textPrimary }]}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <ThemedPressable onPress={clearSearch} style={styles.clearButton}>
              <Ionicons
                name="close-circle"
                size={18}
                color={theme.textSecondary}
              />
            </ThemedPressable>
          )}
        </ThemedPressable>

        <ThemedPressable
          onPress={performSearch}
          style={styles.searchButtonPressable}
        >
          <LinearGradient
            colors={theme.drawingButton as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.searchButton}
          >
            {isFetching && images.length === 0 ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </LinearGradient>
        </ThemedPressable>
      </View>

      {/* Search Mode Filters */}
      <View style={styles.filterSection}>
        <FlatList
          horizontal
          data={["sketch", "color", "drawing"] as const}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isActive = modeFilter === item;
            const labels: Record<string, string> = {
              sketch: "Sketch",
              color: "Coloring",
              drawing: "Outline",
            };
            return (
              <ThemedPressable
                onPress={() => setModeFilter(item)}
                style={[
                  styles.filterTab,
                  isActive && {
                    backgroundColor: theme.textPrimary,
                    borderColor: theme.textPrimary,
                  },
                  !isActive && {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.03)",
                    borderColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.05)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    {
                      color: isActive ? theme.background : theme.textSecondary,
                    },
                    isActive && { fontFamily: FontFamily.bold },
                  ]}
                >
                  {labels[item] || item}
                </Text>
              </ThemedPressable>
            );
          }}
        />
      </View>

      {/* Section Label */}
      {hasQuery && !isLoading && images.length > 0 && (
        <View style={styles.sectionLabelWrap}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            Results for "{activeQuery}"
          </Text>
        </View>
      )}

      {/* Results Grid */}
      <ImageGrid
        data={images.map((img) => ({
          ...img,
          source: undefined, // Hide provider source on cards
        }))}
        onPress={handleImagePress}
        ListEmptyComponent={renderEmpty()}
        ListFooterComponent={renderFooter()}
        numColumns={3}
        onRefresh={hasQuery ? performSearch : undefined}
        refreshing={isFetching && images.length > 0}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <ImageSelectionModal
        visible={isSelectionModalVisible}
        imageUri={selectedImage?.originalUrl || null}
        onClose={() => setIsSelectionModalVisible(false)}
        onApply={handleApplyImage}
      />

      <OutlinePreviewModal
        visible={isPreviewVisible}
        imageUri={selectedImage?.originalUrl || null}
        imageWidth={selectedImage?.width || 1000}
        imageHeight={selectedImage?.height || 1000}
        onClose={() => setIsPreviewVisible(false)}
        onApply={handleConfirmSketch}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  searchButtonPressable: {
    borderRadius: 12,
    overflow: "hidden",
  },
  searchButton: {
    height: 48,
    paddingHorizontal: 16,
    width: 90,
    justifyContent: "center",
    alignItems: "center",
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontFamily: FontFamily.semibold,
    fontSize: 15,
  },
  container: {
    flex: 1,
  },
  sectionLabelWrap: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    marginTop: -20,
  },
  emptyTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 20,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    textAlign: "center",
    marginTop: 2,
    lineHeight: 20,
  },
  footerWrap: {
    paddingTop: 10,
    alignItems: "center",
  },
  loadMorePressable: {
    width: "100%",
    borderRadius: 15,
    overflow: "hidden",
  },
  loadMoreButton: {
    width: "100%",
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  loadMoreText: {
    color: "#FFFFFF",
    fontFamily: FontFamily.semibold,
    fontSize: 15,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.8)",
    zIndex: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 15,
    fontFamily: FontFamily.semibold,
    fontSize: 16,
  },
  modalTextContent: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 10,
    marginBottom: 20,
    marginTop: -10,
    zIndex: 2,
  },
  globalLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loaderBox: {
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  loaderBoxText: {
    marginTop: 16,
    fontFamily: FontFamily.semibold,
    fontSize: 15,
  },
  filterSection: {
    paddingBottom: 12,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
  },
});
