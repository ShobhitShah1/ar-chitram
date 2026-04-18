import { Image } from "expo-image";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, useWindowDimensions, View, Pressable } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { preview_1 } from "@/assets/images";
import { ic_lock } from "@/assets/icons";
import DrawingHeader from "@/components/drawing/drawing-header";
import OpacitySlider from "@/components/drawing/opacity-slider";
import HistoryControls from "@/components/drawing/history-controls";
import { useTheme } from "@/context/theme-context";
import { useStoryFrameSize } from "@/hooks/use-story-frame-size";
import { useVirtualCreativityStore } from "@/features/virtual-creativity/store/virtual-creativity-store";
import { ENABLE_BOUNDARY_OVERFLOW } from "@/features/virtual-creativity/services/virtual-layer-transform";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Snapshot } from "@/components/drawing/capture-preview-modal";
import {
  logDrawingStarted,
  logDrawingCompleted,
} from "@/services/analytics-service";

const AnimatedImage = Animated.createAnimatedComponent(Image);

const TraceCanvas = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams();
  const sliderWidth = width - 210;
  const virtualSnapshotsStore = useVirtualCreativityStore(
    (state) => state.snapshots,
  );
  const drawingHistorySnapshotsStore = useVirtualCreativityStore(
    (state) => state.drawingHistorySnapshots,
  );

  const [isLocked, setIsLocked] = useState<boolean>(false);
  const opacity = useSharedValue(1);

  // Image transformation shared values
  const imageScale = useSharedValue(1);
  const imageTranslateX = useSharedValue(0);
  const imageTranslateY = useSharedValue(0);
  const imageRotation = useSharedValue(0);

  const savedImageScale = useSharedValue(1);
  const savedImageTranslateX = useSharedValue(0);
  const savedImageTranslateY = useSharedValue(0);
  const savedImageRotation = useSharedValue(0);

  const [activeVirtualSnapshotIndex, setActiveVirtualSnapshotIndex] =
    useState(0);
  const hasInitializedSnapshotIndex = useRef(false);
  const drawingStartedLoggedRef = useRef(false);

  const routeImageUri = Array.isArray(params.imageUri)
    ? params.imageUri[0]
    : params.imageUri;
  const routeOriginalImageUri = Array.isArray(params.originalImageUri)
    ? params.originalImageUri[0]
    : params.originalImageUri;
  const routeRestoredSnapshots = Array.isArray(params.restoredSnapshots)
    ? params.restoredSnapshots[0]
    : params.restoredSnapshots;
  const routeSignatureText = Array.isArray(params.signatureText)
    ? params.signatureText[0]
    : params.signatureText;
  const routeSignatureFont = Array.isArray(params.signatureFont)
    ? params.signatureFont[0]
    : params.signatureFont;

  const restoredSnapshots = useMemo<Snapshot[]>(() => {
    if (!routeRestoredSnapshots || typeof routeRestoredSnapshots !== "string") {
      return [];
    }

    try {
      const parsed = JSON.parse(routeRestoredSnapshots) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter(
          (
            item,
          ): item is {
            id: string;
            uri: string;
            timestamp?: number;
          } =>
            !!item &&
            typeof item === "object" &&
            typeof (item as { id?: unknown }).id === "string" &&
            typeof (item as { uri?: unknown }).uri === "string",
        )
        .map((item) => ({
          id: item.id,
          uri: item.uri,
          timestamp: item.timestamp,
        }));
    } catch {
      return [];
    }
  }, [routeRestoredSnapshots]);

  const virtualSnapshots =
    drawingHistorySnapshotsStore.length > 0
      ? drawingHistorySnapshotsStore
      : restoredSnapshots.length > 0
        ? restoredSnapshots
        : virtualSnapshotsStore;
  const overlayFrame = useStoryFrameSize({
    maxWidthRatio: 0.9,
    maxHeightRatio: 0.74,
  });

  useEffect(() => {
    if (virtualSnapshots.length === 0) {
      hasInitializedSnapshotIndex.current = false;
      setActiveVirtualSnapshotIndex(0);
      return;
    }

    setActiveVirtualSnapshotIndex((currentIndex) => {
      if (!hasInitializedSnapshotIndex.current) {
        hasInitializedSnapshotIndex.current = true;
        // Default to the last snapshot (most recent work)
        return virtualSnapshots.length - 1;
      }

      return Math.min(currentIndex, virtualSnapshots.length - 1);
    });
  }, [virtualSnapshots, routeImageUri]);

  useFocusEffect(
    useCallback(() => {
      if (!drawingStartedLoggedRef.current) {
        logDrawingStarted("ar");
        drawingStartedLoggedRef.current = true;
      }
    }, []),
  );

  const activeVirtualSnapshot = virtualSnapshots[activeVirtualSnapshotIndex];
  const sketchImage = activeVirtualSnapshot
    ? { uri: activeVirtualSnapshot.uri }
    : typeof routeImageUri === "string"
      ? { uri: routeImageUri }
      : preview_1;

  const canGoPrevSnapshot =
    virtualSnapshots.length > 1 && activeVirtualSnapshotIndex > 0;
  const canGoNextSnapshot =
    virtualSnapshots.length > 1 &&
    activeVirtualSnapshotIndex < virtualSnapshots.length - 1;

  const prevSnapshotCount =
    virtualSnapshots.length > 0 ? activeVirtualSnapshotIndex : 0;
  const nextSnapshotCount =
    virtualSnapshots.length > 0
      ? virtualSnapshots.length - activeVirtualSnapshotIndex - 1
      : 0;

  const overlayStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateX: imageTranslateX.value },
        { translateY: imageTranslateY.value },
        { scale: imageScale.value },
        { rotate: `${imageRotation.value}rad` },
      ],
    };
  });

  const toggleLock = () => {
    setIsLocked((current) => !current);
  };

  const imageGestures = Gesture.Simultaneous(
    Gesture.Pan()
      .enabled(!isLocked)
      .onUpdate((e) => {
        const nextX = savedImageTranslateX.value + e.translationX;
        const nextY = savedImageTranslateY.value + e.translationY;

        // Apply clamping logic here
        const currentWidth = overlayFrame.width * imageScale.value;
        const currentHeight = overlayFrame.height * imageScale.value;
        const allowanceX = ENABLE_BOUNDARY_OVERFLOW ? currentWidth * 0.2 : 0;
        const allowanceY = ENABLE_BOUNDARY_OVERFLOW ? currentHeight * 0.2 : 0;

        const minX = -width / 2 + currentWidth / 2 - allowanceX;
        const maxX = width / 2 - currentWidth / 2 + allowanceX;
        const minY = -height / 2 + currentHeight / 2 - allowanceY;
        const maxY = height / 2 - currentHeight / 2 + allowanceY;

        imageTranslateX.value = Math.max(minX, Math.min(maxX, nextX));
        imageTranslateY.value = Math.max(minY, Math.min(maxY, nextY));
      })
      .onEnd(() => {
        savedImageTranslateX.value = imageTranslateX.value;
        savedImageTranslateY.value = imageTranslateY.value;
      }),
    Gesture.Pinch()
      .enabled(!isLocked)
      .onUpdate((e) => {
        const nextScale = savedImageScale.value * e.scale;
        const scaleRatio = nextScale / imageScale.value;

        // Origin for overlay is screen center
        const focalX = e.focalX - width / 2;
        const focalY = e.focalY - height / 2;

        const nextTranslateX =
          focalX - (focalX - imageTranslateX.value) * scaleRatio;
        const nextTranslateY =
          focalY - (focalY - imageTranslateY.value) * scaleRatio;

        // Apply clamping logic here
        const currentWidth = overlayFrame.width * nextScale;
        const currentHeight = overlayFrame.height * nextScale;
        const allowanceX = ENABLE_BOUNDARY_OVERFLOW ? currentWidth * 0.2 : 0;
        const allowanceY = ENABLE_BOUNDARY_OVERFLOW ? currentHeight * 0.2 : 0;

        const minX = -width / 2 + currentWidth / 2 - allowanceX;
        const maxX = width / 2 - currentWidth / 2 + allowanceX;
        const minY = -height / 2 + currentHeight / 2 - allowanceY;
        const maxY = height / 2 - currentHeight / 2 + allowanceY;

        imageTranslateX.value = Math.max(minX, Math.min(maxX, nextTranslateX));
        imageTranslateY.value = Math.max(minY, Math.min(maxY, nextTranslateY));

        imageScale.value = nextScale;
      })
      .onEnd(() => {
        savedImageScale.value = imageScale.value;
        savedImageTranslateX.value = imageTranslateX.value;
        savedImageTranslateY.value = imageTranslateY.value;
      }),
    Gesture.Rotation()
      .enabled(!isLocked)
      .onUpdate((e) => {
        imageRotation.value = savedImageRotation.value + e.rotation;
      })
      .onEnd(() => {
        savedImageRotation.value = imageRotation.value;
      }),
    Gesture.LongPress()
      .enabled(!isLocked)
      .onStart(() => {
        imageScale.value = withSpring(1);
        imageTranslateX.value = withSpring(0);
        imageTranslateY.value = withSpring(0);
        imageRotation.value = withSpring(0);
        savedImageScale.value = 1;
        savedImageTranslateX.value = 0;
        savedImageTranslateY.value = 0;
        savedImageRotation.value = 0;
      }),
  );

  const handleComplete = async () => {
    const overlayImageUri =
      activeVirtualSnapshot?.uri ??
      (typeof routeImageUri === "string" ? routeImageUri : undefined);

    logDrawingCompleted("ar");

    router.push({
      pathname: "/drawing/contest-camera",
      params: {
        imageUri: overlayImageUri,
        originalImageUri: routeOriginalImageUri ?? routeImageUri,
        signatureText: routeSignatureText,
        signatureFont: routeSignatureFont,
        overlayOpacity: String(opacity.value),
        imageScale: String(imageScale.value),
        imageTranslateX: String(imageTranslateX.value),
        imageTranslateY: String(imageTranslateY.value),
        imageRotation: String(imageRotation.value),
      },
    });
  };

  const handlePrevSnapshot = () => {
    setActiveVirtualSnapshotIndex((currentIndex) =>
      Math.max(currentIndex - 1, 0),
    );
  };

  const handleNextSnapshot = () => {
    setActiveVirtualSnapshotIndex((currentIndex) =>
      Math.min(currentIndex + 1, virtualSnapshots.length - 1),
    );
  };

  return (
    <GestureHandlerRootView
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom + 10,
          backgroundColor: theme.background,
        },
      ]}
    >
      <View style={styles.imageOverlayWrapper} pointerEvents="box-none">
        <GestureDetector gesture={imageGestures}>
          <AnimatedImage
            source={sketchImage}
            style={[
              styles.overlayImage,
              overlayStyle,
              {
                width: overlayFrame.width,
                height: overlayFrame.height,
              },
            ]}
            contentFit="contain"
          />
        </GestureDetector>
      </View>

      <View
        style={[styles.uiOverlay, { paddingTop: 0, paddingBottom: 0 }]}
        pointerEvents="box-none"
      >
        {!isLocked && (
          <DrawingHeader onComplete={handleComplete} hideGuideButton />
        )}

        <View style={styles.controlsContainer}>
          {!isLocked && (
            <View style={styles.toolsRow}>
              <View style={styles.sliderContainer}>
                <OpacitySlider value={opacity} width={sliderWidth} />
              </View>

              <HistoryControls
                onUndo={handlePrevSnapshot}
                onRedo={handleNextSnapshot}
                canUndo={canGoPrevSnapshot}
                canRedo={canGoNextSnapshot}
                undoCount={prevSnapshotCount}
                redoCount={nextSnapshotCount}
                buttonBackgroundColor="rgba(0,0,0,0.3)"
                iconTintColor="#FFFFFF"
              />
            </View>
          )}

          <View style={styles.toolbarContainer}>
            <Pressable
              onPress={toggleLock}
              style={[
                styles.iconButton,
                { backgroundColor: theme.cardBackground },
              ]}
            >
              <Image
                source={ic_lock}
                style={[styles.iconStyle, { tintColor: theme.textPrimary }]}
                contentFit="contain"
              />
            </Pressable>
          </View>
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

export default TraceCanvas;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  uiOverlay: {
    flex: 1,
    zIndex: 10,
  },
  controlsContainer: {
    width: "100%",
    gap: 16,
    marginTop: "auto",
  },
  toolsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  sliderContainer: {
    flex: 1,
    marginRight: 0,
  },
  imageOverlayWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    pointerEvents: "box-none",
  },
  overlayImage: {
    borderRadius: 18,
    overflow: "hidden",
  },
  toolbarContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    paddingBottom: 10,
  },
  iconButton: {
    padding: 14,
    borderRadius: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconStyle: {
    width: 24,
    height: 24,
  },
});
