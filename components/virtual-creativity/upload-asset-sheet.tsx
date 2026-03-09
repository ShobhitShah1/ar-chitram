import { ic_close, ic_suffel } from "@/assets/icons";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import {
  type CreateFlowPickerAssetItem,
  type PickerFilterOption,
} from "@/hooks/api/use-tab-assets-api";
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

import { CommonBottomSheet } from "../common-bottom-sheet";

const SHEET_HORIZONTAL_PADDING = 12;
const SHEET_TOP_PADDING = 14;
const HEADER_HEIGHT = 52;
const SOURCE_FILTER_HEIGHT = 48;
const CATEGORY_FILTER_HEIGHT = 36;
const SELECTION_META_HEIGHT = 20;
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
  FlatList<CreateFlowPickerAssetItem>,
);

interface UploadAssetSheetProps {
  modalRef: React.RefObject<BottomSheetModal | null>;
  assets: CreateFlowPickerAssetItem[];
  isLoading: boolean;
  isError: boolean;
  onClose: () => void;
  onDone: (item: CreateFlowPickerAssetItem) => void;
  onRetry?: () => void;
  sourceOptions: readonly PickerFilterOption[];
  selectedSourceId: string;
  onSelectSource: (id: string) => void;
  categoryOptions: readonly PickerFilterOption[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
}

interface ThumbnailTileProps {
  item: CreateFlowPickerAssetItem;
  index: number;
  selected: boolean;
  onPress: (index: number) => void;
  borderColor: string;
  selectedBorderColor: string;
  backgroundColor: string;
}

interface SourceSegmentProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  textColor: string;
  selectedTextColor: string;
}

interface CategoryTabProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  textColor: string;
  selectedTextColor: string;
  indicatorColor: string;
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
      transform: [
        { scale: 1 + selectionProgress.value * 0.05 },
        { translateY: -selectionProgress.value * 2 },
      ],
      opacity: 0.82 + selectionProgress.value * 0.18,
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

const SourceSegment: React.FC<SourceSegmentProps> = memo(
  ({
    label,
    selected,
    onPress,
    textColor,
    selectedTextColor,
  }) => {
    const progress = useSharedValue(selected ? 1 : 0);

    useEffect(() => {
      progress.value = withTiming(selected ? 1 : 0, {
        duration: selected ? 180 : 140,
        easing: Easing.out(Easing.cubic),
      });
    }, [progress, selected]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: 1 + progress.value * 0.012 }],
      opacity: 0.84 + progress.value * 0.16,
    }));

    return (
      <AnimatedPressable
        onPress={onPress}
        style={[styles.sourceSegment, animatedStyle]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.sourceSegmentText,
            { color: selected ? selectedTextColor : textColor },
          ]}
        >
          {label}
        </Text>
      </AnimatedPressable>
    );
  },
);

const CategoryTab: React.FC<CategoryTabProps> = memo(
  ({
    label,
    selected,
    onPress,
    textColor,
    selectedTextColor,
    indicatorColor,
  }) => {
    const progress = useSharedValue(selected ? 1 : 0);

    useEffect(() => {
      progress.value = withTiming(selected ? 1 : 0, {
        duration: selected ? 180 : 140,
        easing: Easing.out(Easing.cubic),
      });
    }, [progress, selected]);

    const labelStyle = useAnimatedStyle(() => ({
      opacity: 0.68 + progress.value * 0.32,
      transform: [{ translateY: -progress.value }],
    }));

    const indicatorStyle = useAnimatedStyle(() => ({
      opacity: progress.value,
      transform: [{ scaleX: 0.55 + progress.value * 0.45 }],
    }));

    return (
      <Pressable onPress={onPress} style={styles.categoryTab}>
        <Animated.Text
          numberOfLines={1}
          style={[
            styles.categoryTabText,
            labelStyle,
            { color: selected ? selectedTextColor : textColor },
          ]}
        >
          {label}
        </Animated.Text>
        <Animated.View
          style={[
            styles.categoryTabIndicator,
            indicatorStyle,
            { backgroundColor: indicatorColor },
          ]}
        />
      </Pressable>
    );
  },
);

export const UploadAssetSheet: React.FC<UploadAssetSheetProps> = ({
  modalRef,
  assets,
  isLoading,
  isError,
  onClose,
  onDone,
  onRetry,
  sourceOptions,
  selectedSourceId,
  onSelectSource,
  categoryOptions,
  selectedCategoryId,
  onSelectCategory,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const previewListRef = useRef<FlatList<CreateFlowPickerAssetItem> | null>(
    null,
  );
  const thumbnailsListRef = useRef<FlatList<CreateFlowPickerAssetItem> | null>(
    null,
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [segmentedControlWidth, setSegmentedControlWidth] = useState(0);

  const sheetBottomPadding = Math.max(insets.bottom, 12);
  const previewWidth = Math.max(screenWidth, 1);
  const previewCardWidth = Math.max(
    screenWidth - SHEET_HORIZONTAL_PADDING * 2,
    1,
  );
  const assetsSignature = useMemo(
    () => assets.map((asset) => asset.id).join("|"),
    [assets],
  );

  const hasSourceFilters = sourceOptions.length > 1;
  const hasCategoryFilters = categoryOptions.length > 1;
  const sourceSegmentCount = Math.max(sourceOptions.length, 1);
  const selectedSourceIndex = useMemo(
    () =>
      Math.max(
        0,
        sourceOptions.findIndex((item) => item.id === selectedSourceId),
      ),
    [selectedSourceId, sourceOptions],
  );
  const segmentedInnerWidth = Math.max(segmentedControlWidth - 8, 0);
  const segmentedIndicatorWidth = Math.max(
    (segmentedInnerWidth - (sourceSegmentCount - 1) * 4) / sourceSegmentCount,
    0,
  );
  const sectionCount =
    5 + Number(hasSourceFilters) + Number(hasCategoryFilters);
  const occupiedHeight =
    HEADER_HEIGHT +
    THUMB_SECTION_HEIGHT +
    ACTION_SECTION_HEIGHT +
    SELECTION_META_HEIGHT +
    (hasSourceFilters ? SOURCE_FILTER_HEIGHT : 0) +
    (hasCategoryFilters ? CATEGORY_FILTER_HEIGHT : 0);

  const fixedSheetHeight = useMemo(() => {
    const maxAllowed = Math.max(screenHeight - 12, 440);
    const minPreferred = Math.min(560, maxAllowed);
    const target = Math.min(screenHeight * 0.82, maxAllowed);

    return Math.round(Math.max(minPreferred, target));
  }, [screenHeight]);

  const previewHeight = useMemo(() => {
    const available =
      fixedSheetHeight -
      occupiedHeight -
      sheetBottomPadding -
      SHEET_TOP_PADDING -
      CONTENT_VERTICAL_GAP * (sectionCount - 1);

    return Math.max(PREVIEW_MIN_HEIGHT, available);
  }, [fixedSheetHeight, occupiedHeight, sectionCount, sheetBottomPadding]);

  const shuffleRotation = useSharedValue(0);
  const segmentedIndicatorOffset = useSharedValue(0);
  const shuffleIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${shuffleRotation.value}deg` }],
  }));
  const segmentedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: segmentedIndicatorOffset.value }],
  }));

  const textPrimary = theme.textPrimary;
  const textSecondary = theme.textSecondary;
  const sheetBackground = theme.background;
  const surfaceColor = theme.cardBackground;
  const borderColor = isDark ? "rgba(0,0,0,0.18)" : "rgba(28,28,30,0.12)";
  const controlSurface = isDark ? "rgba(0,0,0,0.04)" : "rgba(28,28,30,0.035)";
  const segmentSelectedBackground = surfaceColor;
  const iconButtonBg = theme.cardBackground;
  const iconButtonBorder = borderColor;
  const thumbBackground = theme.cardBackground;
  const thumbBorder = borderColor;
  const selectedThumbBorder = textPrimary;
  const loadingIndicatorColor = textPrimary;

  useEffect(() => {
    setSelectedIndex(0);

    requestAnimationFrame(() => {
      previewListRef.current?.scrollToOffset({ offset: 0, animated: false });
      thumbnailsListRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, [assetsSignature]);

  useEffect(() => {
    segmentedIndicatorOffset.value = withTiming(
      selectedSourceIndex * (segmentedIndicatorWidth + 4),
      {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      },
    );
  }, [
    segmentedIndicatorOffset,
    segmentedIndicatorWidth,
    selectedSourceIndex,
  ]);

  const handleRequestClose = useCallback(() => {
    modalRef.current?.dismiss();
  }, [modalRef]);

  const scrollToIndex = useCallback(
    (index: number, animated = true) => {
      if (!assets.length) {
        return;
      }

      const safeIndex = Math.max(0, Math.min(index, assets.length - 1));
      setSelectedIndex(safeIndex);

      previewListRef.current?.scrollToIndex({ index: safeIndex, animated });
      thumbnailsListRef.current?.scrollToIndex({
        index: safeIndex,
        animated,
        viewPosition: 0.5,
      });
    },
    [assets.length],
  );

  const handleShuffle = useCallback(() => {
    if (!assets.length) {
      return;
    }

    let next = Math.floor(Math.random() * assets.length);
    if (assets.length > 1 && next === selectedIndex) {
      next = (next + 1) % assets.length;
    }

    shuffleRotation.value = withTiming(shuffleRotation.value + 360, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });

    scrollToIndex(next);
  }, [assets.length, scrollToIndex, selectedIndex, shuffleRotation]);

  const handlePreviewScrollEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      if (!assets.length) {
        return;
      }

      const next = Math.round(event.nativeEvent.contentOffset.x / previewWidth);
      scrollToIndex(next, false);
    },
    [assets.length, previewWidth, scrollToIndex],
  );

  const handleDone = useCallback(() => {
    const selectedAsset = assets[selectedIndex];
    if (!selectedAsset) {
      return;
    }

    onDone(selectedAsset);
  }, [assets, onDone, selectedIndex]);

  const previewItemLayout = useCallback(
    (
      _: ArrayLike<CreateFlowPickerAssetItem> | null | undefined,
      index: number,
    ) => ({
      index,
      length: previewWidth,
      offset: previewWidth * index,
    }),
    [previewWidth],
  );

  const thumbItemLayout = useCallback(
    (
      _: ArrayLike<CreateFlowPickerAssetItem> | null | undefined,
      index: number,
    ) => ({
      index,
      length: THUMB_SIZE + THUMB_GAP,
      offset: (THUMB_SIZE + THUMB_GAP) * index,
    }),
    [],
  );

  const handlePreviewScrollFailed = useCallback(
    (info: { index: number }) => {
      requestAnimationFrame(() => {
        previewListRef.current?.scrollToIndex({
          index: Math.max(0, Math.min(info.index, assets.length - 1)),
          animated: true,
        });
      });
    },
    [assets.length],
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
    ({ item }: ListRenderItemInfo<CreateFlowPickerAssetItem>) => (
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
    ({ item, index }: ListRenderItemInfo<CreateFlowPickerAssetItem>) => (
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

  const renderCategoryTab = useCallback(
    ({ item }: ListRenderItemInfo<PickerFilterOption>) => (
      <CategoryTab
        label={item.label}
        selected={item.id === selectedCategoryId}
        onPress={() => onSelectCategory(item.id)}
        textColor={textSecondary}
        selectedTextColor={textPrimary}
        indicatorColor={textPrimary}
      />
    ),
    [onSelectCategory, selectedCategoryId, textPrimary, textSecondary],
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
        {
          paddingBottom: sheetBottomPadding,
        },
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
            onPress={handleRequestClose}
            style={[
              styles.iconButton,
              {
                backgroundColor: iconButtonBg,
                borderColor: iconButtonBorder,
              },
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
            <Text style={[styles.headerTitle, { color: textPrimary }]}>Add Image</Text>
            <Text style={[styles.headerSubtitle, { color: textSecondary }]}>Color, draw and sketch</Text>
          </View>

          <AnimatedPressable
            onPress={handleShuffle}
            style={[
              styles.iconButton,
              {
                backgroundColor: iconButtonBg,
                borderColor: iconButtonBorder,
              },
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

        {hasSourceFilters ? (
          <View style={styles.segmentedWrap}>
            <View
              style={[
                styles.segmentedControl,
                {
                  backgroundColor: controlSurface,
                  borderColor,
                },
              ]}
              onLayout={(event) => {
                setSegmentedControlWidth(event.nativeEvent.layout.width);
              }}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.segmentedIndicator,
                  segmentedIndicatorStyle,
                  {
                    width: segmentedIndicatorWidth,
                    backgroundColor: segmentSelectedBackground,
                    opacity: segmentedIndicatorWidth > 0 ? 1 : 0,
                  },
                ]}
              />
              {sourceOptions.map((item) => (
                <SourceSegment
                  key={item.id}
                  label={item.label}
                  selected={item.id === selectedSourceId}
                  onPress={() => onSelectSource(item.id)}
                  textColor={textSecondary}
                  selectedTextColor={textPrimary}
                />
              ))}
            </View>
          </View>
        ) : null}

        {hasCategoryFilters ? (
          <View style={styles.categoryTabsWrap}>
            <FlatList
              data={categoryOptions as PickerFilterOption[]}
              horizontal
              bounces={false}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={renderCategoryTab}
              contentContainerStyle={styles.categoryTabsContent}
              ItemSeparatorComponent={() => <View style={styles.categorySpacer} />}
            />
          </View>
        ) : null}

        <View style={[styles.previewSection, { minHeight: previewHeight }]}>
          {isLoading ? (
            <View style={styles.stateWrap}>
              <ActivityIndicator color={loadingIndicatorColor} size="small" />
              <Text style={[styles.stateText, { color: textSecondary }]}>Loading images...</Text>
            </View>
          ) : isError && assets.length === 0 ? (
            <View style={styles.stateWrap}>
              <Text style={[styles.stateText, { color: textPrimary }]}>Unable to load images.</Text>
              {onRetry ? (
                <Pressable
                  style={[
                    styles.retryButton,
                    {
                      backgroundColor: controlSurface,
                      borderColor,
                    },
                  ]}
                  onPress={onRetry}
                >
                  <Text style={[styles.retryText, { color: textPrimary }]}>Retry</Text>
                </Pressable>
              ) : null}
            </View>
          ) : assets.length === 0 ? (
            <View style={styles.stateWrap}>
              <Text style={[styles.stateText, { color: textPrimary }]}>No images available.</Text>
            </View>
          ) : (
            <AnimatedFlatList
              ref={previewListRef}
              data={assets}
              horizontal
              pagingEnabled
              bounces={false}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={renderPreviewItem}
              getItemLayout={previewItemLayout}
              onMomentumScrollEnd={handlePreviewScrollEnd}
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

        <View style={styles.selectionMetaRow}>
          {selectedAsset ? (
            <>
              <Text style={[styles.selectionMetaPrimary, { color: textPrimary }]}> 
                {selectedAsset.sourceLabel}
              </Text>
              <View style={[styles.selectionMetaDot, { backgroundColor: borderColor }]} />
              <Text style={[styles.selectionMetaSecondary, { color: textSecondary }]}> 
                {selectedAsset.categoryName}
              </Text>
            </>
          ) : null}
        </View>

        <View style={styles.thumbsSection}>
          <FlatList
            ref={thumbnailsListRef}
            data={assets}
            horizontal
            bounces={false}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={renderThumbItem}
            getItemLayout={thumbItemLayout}
            onScrollToIndexFailed={handleThumbScrollFailed}
            ItemSeparatorComponent={() => <View style={styles.thumbSpacer} />}
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
              <Text style={styles.doneText}>Add to Canvas</Text>
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
    paddingHorizontal: 10,
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
  segmentedWrap: {
    paddingHorizontal: SHEET_HORIZONTAL_PADDING,
    minHeight: SOURCE_FILTER_HEIGHT,
  },
  segmentedControl: {
    minHeight: 42,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    padding: 4,
    gap: 4,
    position: "relative",
  },
  segmentedIndicator: {
    position: "absolute",
    left: 4,
    top: 4,
    bottom: 4,
    borderRadius: 12,
  },
  sourceSegment: {
    flex: 1,
    minHeight: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  sourceSegmentText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  categoryTabsWrap: {
    minHeight: CATEGORY_FILTER_HEIGHT,
  },
  categoryTabsContent: {
    paddingHorizontal: SHEET_HORIZONTAL_PADDING,
  },
  categoryTab: {
    minHeight: 32,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  categoryTabText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
  },
  categoryTabIndicator: {
    marginTop: 6,
    width: 18,
    height: 2,
    borderRadius: 999,
  },
  categorySpacer: {
    width: 18,
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
    height: "100%",
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  selectionMetaRow: {
    height: SELECTION_META_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SHEET_HORIZONTAL_PADDING,
  },
  selectionMetaPrimary: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
  },
  selectionMetaSecondary: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
  },
  selectionMetaDot: {
    width: 4,
    height: 4,
    borderRadius: 999,
    marginHorizontal: 8,
  },
  thumbsSection: {
    minHeight: THUMB_SECTION_HEIGHT,
    justifyContent: "center",
  },
  thumbsContent: {
    paddingHorizontal: SHEET_HORIZONTAL_PADDING,
    paddingVertical: 4,
  },
  thumbSpacer: {
    width: THUMB_GAP,
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
    paddingHorizontal: SHEET_HORIZONTAL_PADDING,
  },
  stateText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    textAlign: "center",
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


