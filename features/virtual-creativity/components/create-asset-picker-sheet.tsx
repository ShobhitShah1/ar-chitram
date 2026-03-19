import { ic_close, ic_suffel } from "@/assets/icons";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { TabAssetItem } from "@/services/api/tab-assets-service";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  type ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CommonBottomSheet } from "@/components/common-bottom-sheet";
import { UploadEntryButton } from "./upload-entry-button";

const SHEET_HORIZONTAL_PADDING = 12;
const SHEET_TOP_PADDING = 14;
const HEADER_HEIGHT = 52;
const UPLOAD_SECTION_HEIGHT = 72;
const THUMB_SIZE = 72;
const THUMB_IMAGE_INSET = 6;
const THUMB_GAP = 10;
const THUMB_SECTION_HEIGHT = 92;
const ACTION_HEIGHT = 50;
const ACTION_BOTTOM_PADDING = 2;
const ACTION_SECTION_HEIGHT = ACTION_HEIGHT + ACTION_BOTTOM_PADDING;
const CONTENT_VERTICAL_GAP = 8;
const PREVIEW_MIN_HEIGHT = 160;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList<CreateSheetAssetItem>,
);

export type CreateSheetAssetItem = Pick<
  TabAssetItem,
  "id" | "image" | "isPremium"
>;

interface CreateAssetPickerSheetProps {
  modalRef: React.RefObject<BottomSheetModal | null>;
  assets: CreateSheetAssetItem[];
  isLoading: boolean;
  isError: boolean;
  onClose: () => void;
  onDone: (item: CreateSheetAssetItem) => void;
  onRetry?: () => void;
  onUploadPress?: () => void;
  isUploadActionBusy?: boolean;
}

interface ThumbnailTileProps {
  item: CreateSheetAssetItem;
  index: number;
  selected: boolean;
  onPress: (index: number) => void;
  borderColor: string;
  selectedBorderColor: string;
  backgroundColor: string;
}

const ThumbnailTile: React.FC<ThumbnailTileProps> = memo(
  ({
    item,
    index,
    selected,
    onPress,
    borderColor,
    selectedBorderColor,
    backgroundColor,
  }) => {
    const selectionProgress = useSharedValue(selected ? 1 : 0);

    useEffect(() => {
      selectionProgress.value = withTiming(selected ? 1 : 0, {
        duration: selected ? 180 : 140,
        easing: Easing.out(Easing.cubic),
      });
    }, [selected, selectionProgress]);

    const animatedTileStyle = useAnimatedStyle(() => ({
      opacity: 0.75 + selectionProgress.value * 0.25,
    }));

    return (
      <AnimatedPressable
        onPress={() => onPress(index)}
        style={[
          styles.thumbTile,
          animatedTileStyle,
          {
            borderColor: selected ? selectedBorderColor : borderColor,
            borderWidth: selected ? 2 : 1.25,
            backgroundColor,
          },
        ]}
      >
        <View style={styles.thumbImageWrap}>
          <Image
            source={{ uri: item.image }}
            style={styles.thumbImage}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={120}
          />
        </View>
      </AnimatedPressable>
    );
  },
);

export const CreateAssetPickerSheet: React.FC<CreateAssetPickerSheetProps> = ({
  modalRef,
  assets,
  isLoading,
  isError,
  onClose,
  onDone,
  onRetry,
  onUploadPress,
  isUploadActionBusy = false,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const previewListRef = useRef<FlatList<CreateSheetAssetItem> | null>(null);
  const thumbnailsListRef = useRef<FlatList<CreateSheetAssetItem> | null>(null);

  const [selectedIndex, setSelectedIndex] = useState(0);

  // Prevents the viewability callback from fighting with programmatic scrolls
  const isProgrammaticScroll = useRef(false);
  const programmaticScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const sheetBottomPadding = Math.max(insets.bottom, 12);
  const previewWidth = Math.max(screenWidth, 1);
  const previewCardWidth = Math.max(
    screenWidth - SHEET_HORIZONTAL_PADDING * 2,
    1,
  );

  const fixedSheetHeight = useMemo(() => {
    const maxAllowed = Math.max(screenHeight - 12, 440);
    const minPreferred = Math.min(540, maxAllowed);
    const target = Math.min(screenHeight * 0.8, maxAllowed);
    return Math.round(Math.max(minPreferred, target));
  }, [screenHeight]);

  const hasUploadAction = !!onUploadPress;
  const previewHeight = useMemo(() => {
    const available =
      fixedSheetHeight -
      HEADER_HEIGHT -
      (hasUploadAction ? UPLOAD_SECTION_HEIGHT : 0) -
      THUMB_SECTION_HEIGHT -
      ACTION_SECTION_HEIGHT -
      sheetBottomPadding -
      SHEET_TOP_PADDING -
      CONTENT_VERTICAL_GAP * (hasUploadAction ? 4 : 3);

    return Math.max(PREVIEW_MIN_HEIGHT, available);
  }, [fixedSheetHeight, hasUploadAction, sheetBottomPadding]);

  const shuffleRotation = useSharedValue(0);
  const shuffleIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${shuffleRotation.value}deg` }],
  }));

  const textPrimary = theme.textPrimary;
  const textSecondary = theme.textSecondary;
  const sheetBackground = theme.background;
  const surfaceColor = theme.cardBackground;
  const borderColor = isDark ? "rgba(0,0,0,0.18)" : "rgba(28,28,30,0.12)";
  const iconButtonBg = theme.cardBackground;
  const iconButtonBorder = borderColor;
  const thumbBackground = theme.cardBackground;
  const thumbBorder = borderColor;
  const selectedThumbBorder = textPrimary;
  const loadingIndicatorColor = textPrimary;
  const retryButtonBackground = isDark
    ? "rgba(0,0,0,0.05)"
    : "rgba(28,28,30,0.04)";

  useEffect(() => {
    if (assets.length === 0) {
      setSelectedIndex(0);
      return;
    }
    if (selectedIndex >= assets.length) {
      setSelectedIndex(0);
    }
  }, [assets.length, selectedIndex]);

  const syncThumbnailToIndex = useCallback((index: number, animated = true) => {
    thumbnailsListRef.current?.scrollToIndex({
      index,
      animated,
      viewPosition: 0.5,
    });
  }, []);

  const scrollToIndex = useCallback(
    (index: number, animated = true) => {
      if (!assets.length) return;

      const safeIndex = Math.max(0, Math.min(index, assets.length - 1));

      // Lock out viewability callback to prevent feedback loop
      if (programmaticScrollTimer.current) {
        clearTimeout(programmaticScrollTimer.current);
      }
      isProgrammaticScroll.current = true;
      programmaticScrollTimer.current = setTimeout(
        () => {
          isProgrammaticScroll.current = false;
        },
        animated ? 450 : 50,
      );

      setSelectedIndex(safeIndex);

      // scrollToOffset is more reliable than scrollToIndex for paged lists
      previewListRef.current?.scrollToOffset({
        offset: safeIndex * previewWidth,
        animated,
      });
      syncThumbnailToIndex(safeIndex, animated);
    },
    [assets.length, previewWidth, syncThumbnailToIndex],
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 });

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      // Skip when we triggered the scroll ourselves to avoid the feedback loop
      if (isProgrammaticScroll.current) return;
      if (!viewableItems.length || viewableItems[0].index === null) return;

      const index = viewableItems[0].index;
      setSelectedIndex(index);
      syncThumbnailToIndex(index);
    },
    [syncThumbnailToIndex],
  );

  const handleShuffle = useCallback(() => {
    if (!assets.length) return;

    let next = Math.floor(Math.random() * assets.length);
    if (assets.length > 1 && next === selectedIndex) {
      next = (next + 1) % assets.length;
    }

    shuffleRotation.value = withTiming(shuffleRotation.value + 360, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });

    scrollToIndex(next);
  }, [assets.length, selectedIndex, scrollToIndex, shuffleRotation]);

  const handleDone = useCallback(() => {
    const selectedAsset = assets[selectedIndex];
    if (!selectedAsset) return;
    onDone(selectedAsset);
  }, [assets, onDone, selectedIndex]);

  const previewItemLayout = useCallback(
    (_: ArrayLike<CreateSheetAssetItem> | null | undefined, index: number) => ({
      index,
      length: previewWidth,
      offset: previewWidth * index,
    }),
    [previewWidth],
  );

  const thumbItemLayout = useCallback(
    (_: ArrayLike<CreateSheetAssetItem> | null | undefined, index: number) => ({
      index,
      length: THUMB_SIZE + THUMB_GAP,
      offset: (THUMB_SIZE + THUMB_GAP) * index,
    }),
    [],
  );

  const handlePreviewScrollFailed = useCallback(
    (info: { index: number }) => {
      requestAnimationFrame(() => {
        previewListRef.current?.scrollToOffset({
          offset:
            Math.max(0, Math.min(info.index, assets.length - 1)) * previewWidth,
          animated: true,
        });
      });
    },
    [assets.length, previewWidth],
  );

  const handleThumbScrollFailed = useCallback(
    (info: { index: number }) => {
      requestAnimationFrame(() => {
        thumbnailsListRef.current?.scrollToIndex({
          index: Math.max(0, Math.min(info.index, assets.length - 1)),
          animated: true,
          viewPosition: 0.5,
        });
      });
    },
    [assets.length],
  );

  const renderPreviewItem = useCallback(
    ({ item }: ListRenderItemInfo<CreateSheetAssetItem>) => (
      <View
        style={[
          styles.previewSlide,
          { width: previewWidth, height: previewHeight },
        ]}
      >
        <View
          style={[
            styles.previewCard,
            {
              width: previewCardWidth,
              borderColor,
              backgroundColor: surfaceColor,
            },
          ]}
        >
          <Image
            source={{ uri: item.image }}
            style={styles.previewImage}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={140}
          />
        </View>
      </View>
    ),
    [borderColor, previewCardWidth, previewHeight, previewWidth, surfaceColor],
  );

  const renderThumbItem = useCallback(
    ({ item, index }: ListRenderItemInfo<CreateSheetAssetItem>) => (
      <ThumbnailTile
        item={item}
        index={index}
        selected={index === selectedIndex}
        onPress={scrollToIndex}
        borderColor={thumbBorder}
        selectedBorderColor={selectedThumbBorder}
        backgroundColor={thumbBackground}
      />
    ),
    [
      scrollToIndex,
      selectedIndex,
      selectedThumbBorder,
      thumbBackground,
      thumbBorder,
    ],
  );

  const selectedAsset = assets[selectedIndex] ?? null;

  const doneGradientColors = useMemo(
    () =>
      (theme.drawingButton?.length
        ? theme.drawingButton
        : ["#3E3E3E", "#232323"]) as [string, string, ...string[]],
    [theme.drawingButton],
  );

  return (
    <CommonBottomSheet
      modalRef={modalRef}
      onDismiss={onClose}
      snapPoints={[fixedSheetHeight]}
      contentContainerStyle={[
        styles.sheetContent,
        { paddingBottom: sheetBottomPadding },
      ]}
      backgroundStyle={{
        backgroundColor: sheetBackground,
        borderColor,
      }}
      enablePanDownToClose={false}
      enableDynamicSizing={false}
      enableContentPanningGesture={false}
      enableHandlePanningGesture={false}
      showBackdrop
      backdropOpacity={0.42}
      showHandle={false}
    >
      <View style={styles.container}>
        <View style={[styles.headerRow, { minHeight: HEADER_HEIGHT }]}>
          <Pressable
            onPress={onClose}
            style={[
              styles.iconButton,
              { backgroundColor: iconButtonBg, borderColor: iconButtonBorder },
            ]}
            hitSlop={10}
          >
            <Image
              source={ic_close}
              style={[styles.headerIcon, { tintColor: textPrimary }]}
              contentFit="contain"
            />
          </Pressable>

          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { color: textPrimary }]}>
              Choose Image
            </Text>
            <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
              Swipe or shuffle
            </Text>
          </View>

          <AnimatedPressable
            onPress={handleShuffle}
            style={[
              styles.iconButton,
              { backgroundColor: iconButtonBg, borderColor: iconButtonBorder },
              shuffleIconStyle,
            ]}
            hitSlop={10}
            disabled={!assets.length}
          >
            <Image
              source={ic_suffel}
              style={[styles.headerIcon, { tintColor: textPrimary }]}
              contentFit="contain"
            />
          </AnimatedPressable>
        </View>

        {hasUploadAction ? (
          <View style={styles.uploadSection}>
            <UploadEntryButton
              title="Upload Your Image"
              subtitle="Preview background removal before you continue"
              onPress={onUploadPress ?? (() => {})}
              disabled={isUploadActionBusy}
            />
          </View>
        ) : null}

        <View style={[styles.previewSection, { minHeight: previewHeight }]}>
          {isLoading ? (
            <View style={styles.stateWrap}>
              <ActivityIndicator color={loadingIndicatorColor} size="small" />
              <Text style={[styles.stateText, { color: textSecondary }]}>
                Loading images...
              </Text>
            </View>
          ) : isError && assets.length === 0 ? (
            <View style={styles.stateWrap}>
              <Text style={[styles.stateText, { color: textPrimary }]}>
                Unable to load images.
              </Text>
              {onRetry ? (
                <Pressable
                  style={[
                    styles.retryButton,
                    { backgroundColor: retryButtonBackground, borderColor },
                  ]}
                  onPress={onRetry}
                >
                  <Text style={[styles.retryText, { color: textPrimary }]}>
                    Retry
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : assets.length === 0 ? (
            <View style={styles.stateWrap}>
              <Text style={[styles.stateText, { color: textPrimary }]}>
                No images available.
              </Text>
            </View>
          ) : (
            <AnimatedFlatList
              ref={previewListRef}
              data={assets}
              horizontal
              pagingEnabled
              bounces={false}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item: CreateSheetAssetItem) => item.id}
              renderItem={renderPreviewItem}
              getItemLayout={previewItemLayout}
              onViewableItemsChanged={handleViewableItemsChanged}
              viewabilityConfig={viewabilityConfig.current}
              onScrollToIndexFailed={handlePreviewScrollFailed}
              initialNumToRender={2}
              maxToRenderPerBatch={3}
              windowSize={4}
              removeClippedSubviews
              scrollEventThrottle={16}
              decelerationRate="fast"
            />
          )}
        </View>

        <View style={styles.thumbsSection}>
          <FlatList
            ref={thumbnailsListRef}
            data={assets}
            horizontal
            bounces={false}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item: CreateSheetAssetItem) => item.id}
            renderItem={renderThumbItem}
            getItemLayout={thumbItemLayout}
            onScrollToIndexFailed={handleThumbScrollFailed}
            ItemSeparatorComponent={() => <View style={{ width: THUMB_GAP }} />}
            contentContainerStyle={styles.thumbsContent}
            initialNumToRender={8}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={false}
          />
        </View>

        <View style={styles.actionSection}>
          <Pressable
            onPress={handleDone}
            disabled={!selectedAsset || isLoading}
            style={({ pressed }) => [
              styles.donePressable,
              pressed && selectedAsset ? styles.donePressed : null,
              !selectedAsset || isLoading ? styles.doneDisabled : null,
            ]}
          >
            <LinearGradient
              colors={doneGradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.doneButton}
            >
              <Text style={styles.doneText}>Done</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </CommonBottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetContent: {
    flex: 1,
    paddingTop: SHEET_TOP_PADDING,
  },
  container: {
    flex: 1,
    gap: CONTENT_VERTICAL_GAP,
  },
  uploadSection: {
    paddingHorizontal: SHEET_HORIZONTAL_PADDING,
    minHeight: UPLOAD_SECTION_HEIGHT,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SHEET_HORIZONTAL_PADDING,
  },
  headerTextWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIcon: {
    width: 18,
    height: 18,
  },
  headerTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 16,
    lineHeight: 20,
  },
  headerSubtitle: {
    marginTop: 1,
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  previewSection: {
    flex: 1,
    justifyContent: "center",
  },
  previewSlide: {
    justifyContent: "center",
    alignItems: "center",
  },
  previewCard: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  thumbsSection: {
    minHeight: THUMB_SECTION_HEIGHT,
    justifyContent: "center",
  },
  thumbsContent: {
    paddingHorizontal: SHEET_HORIZONTAL_PADDING,
    paddingVertical: 4,
  },
  thumbTile: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbImageWrap: {
    width: THUMB_SIZE - THUMB_IMAGE_INSET * 2,
    height: THUMB_SIZE - THUMB_IMAGE_INSET * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  stateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  stateText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
  },
  retryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  retryText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
  },
  actionSection: {
    height: ACTION_SECTION_HEIGHT,
    justifyContent: "center",
    paddingBottom: ACTION_BOTTOM_PADDING,
    paddingHorizontal: SHEET_HORIZONTAL_PADDING,
  },
  donePressable: {
    height: ACTION_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
  },
  doneButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  doneText: {
    color: "#FFFFFF",
    fontFamily: FontFamily.semibold,
    fontSize: 15,
  },
  donePressed: {
    opacity: 0.92,
  },
  doneDisabled: {
    opacity: 0.45,
  },
});
