import { ic_close, ic_suffel } from "@/assets/icons";
import { FontFamily } from "@/constants/fonts";
import { PremiumPickerEntryMode } from "@/constants/premium-config";
import { ic_pro_icon } from "@/assets/icons";
import { useTheme } from "@/context/theme-context";
import { TabAssetItem } from "@/services/api/tab-assets-service";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
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
import { PremiumSheetActionBar } from "./premium-sheet-action-bar";
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
  "id" | "image" | "isPremium" | "sku"
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
  premiumActionMode?: PremiumPickerEntryMode;
  isPremiumAssetUnlocked?: (item: CreateSheetAssetItem) => boolean;
  getPremiumPriceLabelForAsset?: (
    item: CreateSheetAssetItem,
  ) => string | undefined;
  onSelectedAssetChange?: (item: CreateSheetAssetItem | null) => void;
  onFreePremiumAsset?: (item: CreateSheetAssetItem) => void;
  onBuyPremiumAsset?: (item: CreateSheetAssetItem) => void;
  isFreePremiumActionBusy?: boolean;
  isPremiumActionBusy?: boolean;
  premiumPriceLabel?: string;
}

interface ThumbnailTileProps {
  item: CreateSheetAssetItem;
  index: number;
  selected: boolean;
  isUnlocked: boolean;
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
    isUnlocked,
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
          {item.id === "blank" ? (
            <View style={styles.blankThumbContainer}>
              <Text style={styles.blankThumbText}>Blank</Text>
            </View>
          ) : (
            <Image
              source={{ uri: item.image }}
              style={styles.thumbImage}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={120}
            />
          )}
        </View>
        {item.isPremium && !isUnlocked ? (
          <View pointerEvents="none" style={styles.thumbBadgeWrap}>
            <Image
              source={ic_pro_icon}
              style={styles.thumbBadge}
              contentFit="contain"
              transition={0}
            />
          </View>
        ) : null}
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
  premiumActionMode = "modal",
  isPremiumAssetUnlocked,
  getPremiumPriceLabelForAsset,
  onSelectedAssetChange,
  onFreePremiumAsset,
  onBuyPremiumAsset,
  isFreePremiumActionBusy = false,
  isPremiumActionBusy = false,
  premiumPriceLabel,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const previewListRef = useRef<FlatList<CreateSheetAssetItem> | null>(null);
  const thumbnailsListRef = useRef<FlatList<CreateSheetAssetItem> | null>(null);

  const [selectedIndex, setSelectedIndex] = useState(1);

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

  const displayAssets = useMemo(() => {
    const blankAsset = {
      id: "blank",
      image: "",
      isPremium: false,
      sku: "",
      sourceLabel: "Canvas",
      categoryName: "Blank",
    } as any;
    return [blankAsset, ...assets];
  }, [assets]);

  const syncThumbnailToIndex = useCallback((index: number, animated = true) => {
    thumbnailsListRef.current?.scrollToIndex({
      index,
      animated,
      viewPosition: 0.5,
    });
  }, []);

  const scrollToIndex = useCallback(
    (index: number, animated = true) => {
      if (!displayAssets.length) return;

      const safeIndex = Math.max(0, Math.min(index, displayAssets.length - 1));

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
    [displayAssets.length, previewWidth, syncThumbnailToIndex],
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
    if (!displayAssets.length) return;

    let next = Math.floor(Math.random() * displayAssets.length);
    if (displayAssets.length > 1 && next === selectedIndex) {
      next = (next + 1) % displayAssets.length;
    }

    shuffleRotation.value = withTiming(shuffleRotation.value + 360, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });

    scrollToIndex(next);
  }, [displayAssets.length, selectedIndex, scrollToIndex, shuffleRotation]);

  const handleDone = useCallback(() => {
    const selectedAsset = displayAssets[selectedIndex];
    if (!selectedAsset) return;
    onDone(selectedAsset);
  }, [displayAssets, onDone, selectedIndex]);

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
            Math.max(0, Math.min(info.index, displayAssets.length - 1)) *
            previewWidth,
          animated: true,
        });
      });
    },
    [displayAssets.length, previewWidth],
  );

  const handleThumbScrollFailed = useCallback(
    (info: { index: number }) => {
      requestAnimationFrame(() => {
        thumbnailsListRef.current?.scrollToIndex({
          index: Math.max(0, Math.min(info.index, displayAssets.length - 1)),
          animated: true,
          viewPosition: 0.5,
        });
      });
    },
    [displayAssets.length],
  );

  const renderPreviewItem = useCallback(
    ({ item }: ListRenderItemInfo<CreateSheetAssetItem>) => {
      const isUnlocked = isPremiumAssetUnlocked?.(item) ?? false;

      return (
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
            {item.id === "blank" ? (
              <View style={styles.blankPreviewContainer}>
                <Text style={[styles.blankPreviewText, { color: textPrimary }]}>
                  Blank Canvas
                </Text>
              </View>
            ) : (
              <Image
                source={{ uri: item.image }}
                style={styles.previewImage}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={140}
              />
            )}
            {item.isPremium && !isUnlocked ? (
              <View pointerEvents="none" style={styles.previewBadgeWrap}>
                <Image
                  source={ic_pro_icon}
                  style={styles.previewBadge}
                  contentFit="contain"
                  transition={0}
                />
              </View>
            ) : null}
          </View>
        </View>
      );
    },
    [
      borderColor,
      isPremiumAssetUnlocked,
      previewCardWidth,
      previewHeight,
      previewWidth,
      surfaceColor,
    ],
  );

  const renderThumbItem = useCallback(
    ({ item, index }: ListRenderItemInfo<CreateSheetAssetItem>) => (
      <ThumbnailTile
        item={item}
        index={index}
        selected={index === selectedIndex}
        isUnlocked={isPremiumAssetUnlocked?.(item) ?? false}
        onPress={scrollToIndex}
        borderColor={thumbBorder}
        selectedBorderColor={selectedThumbBorder}
        backgroundColor={thumbBackground}
      />
    ),
    [
      isPremiumAssetUnlocked,
      scrollToIndex,
      selectedIndex,
      selectedThumbBorder,
      thumbBackground,
      thumbBorder,
    ],
  );

  const selectedAsset = displayAssets[selectedIndex] ?? null;
  const selectedAssetHasAccess = selectedAsset
    ? (isPremiumAssetUnlocked?.(selectedAsset) ?? false)
    : false;
  const selectedAssetPriceLabel = selectedAsset
    ? (getPremiumPriceLabelForAsset?.(selectedAsset) ?? premiumPriceLabel)
    : premiumPriceLabel;
  const showPremiumSplitActions =
    premiumActionMode === "split" &&
    !!selectedAsset?.isPremium &&
    !selectedAssetHasAccess &&
    !!onFreePremiumAsset &&
    !!onBuyPremiumAsset;

  const handleWatchAd = useCallback(() => {
    if (!selectedAsset || !onFreePremiumAsset) {
      return;
    }

    onFreePremiumAsset(selectedAsset);
  }, [onFreePremiumAsset, selectedAsset]);

  const handleBuy = useCallback(() => {
    if (!selectedAsset || !onBuyPremiumAsset) {
      return;
    }

    onBuyPremiumAsset(selectedAsset);
  }, [onBuyPremiumAsset, selectedAsset]);

  useEffect(() => {
    onSelectedAssetChange?.(selectedAsset);
  }, [onSelectedAssetChange, selectedAsset]);

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
            disabled={!displayAssets.length}
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
          ) : isError && displayAssets.length === 0 ? (
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
          ) : displayAssets.length === 0 ? (
            <View style={styles.stateWrap}>
              <Text style={[styles.stateText, { color: textPrimary }]}>
                No images available.
              </Text>
            </View>
          ) : (
            <AnimatedFlatList
              key={displayAssets.length > 1 ? "ready" : "empty"}
              ref={previewListRef}
              data={displayAssets}
              initialScrollIndex={displayAssets.length > 1 ? 1 : 0}
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
            key={displayAssets.length > 1 ? "ready" : "empty"}
            ref={thumbnailsListRef}
            data={displayAssets}
            initialScrollIndex={displayAssets.length > 1 ? 1 : 0}
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
          <PremiumSheetActionBar
            doneLabel="Done"
            onDone={handleDone}
            doneDisabled={!selectedAsset || isLoading}
            showPremiumActions={showPremiumSplitActions}
            onWatchAdPress={handleWatchAd}
            onBuyPress={handleBuy}
            watchAdDisabled={
              !selectedAsset || isLoading || isFreePremiumActionBusy
            }
            buyDisabled={!selectedAsset || isLoading || isPremiumActionBusy}
            premiumPriceLabel={selectedAssetPriceLabel}
          />
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
  previewBadgeWrap: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  previewBadge: {
    width: "100%",
    height: "100%",
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
    position: "relative",
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
  thumbBadgeWrap: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  thumbBadge: {
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
  blankThumbContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(150,150,150,0.1)",
    borderRadius: 8,
  },
  blankThumbText: {
    fontFamily: FontFamily.semibold,
    fontSize: 10,
    color: "#888",
  },
  blankPreviewContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  blankPreviewText: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    opacity: 0.3,
  },
});
