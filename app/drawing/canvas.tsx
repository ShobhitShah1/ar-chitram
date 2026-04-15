import { CameraView, useCameraPermissions } from "expo-camera";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { preview_1 } from "@/assets/images";
import { CameraPermissionView } from "@/components/camera/camera-permission-view";
import DrawingHeader from "@/components/drawing/drawing-header";
import OpacitySlider from "@/components/drawing/opacity-slider";
import DrawingToolbar from "@/components/drawing/drawing-toolbar";
import HistoryControls from "@/components/drawing/history-controls";
import {
  CapturePreviewModal,
  Snapshot,
} from "@/components/drawing/capture-preview-modal";
import ScreenshotCaptureAnimation from "@/components/drawing/screenshot-capture-animation";
import { useTheme } from "@/context/theme-context";
import { persistLocalRecordingReference } from "@/features/gallery/services/local-gallery-service";
import { useStoryFrameSize } from "@/hooks/use-story-frame-size";
import {
  requestVideoMediaPermissions,
  saveToArChitramAlbum,
} from "@/services/media-save-service";
import { takeNormalizedStoryPicture } from "@/services/story-media-service";
import { useVirtualCreativityStore } from "@/features/virtual-creativity/store/virtual-creativity-store";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utils/story-frame";
import { ENABLE_BOUNDARY_OVERFLOW } from "@/features/virtual-creativity/services/virtual-layer-transform";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

const AnimatedImage = Animated.createAnimatedComponent(Image);
const CAMERA_PINCH_SENSITIVITY = 0.35;
const MIN_CAMERA_ZOOM = 0;
const MAX_CAMERA_ZOOM = 1;

const Canvas = () => {
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

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [cameraMode, setCameraMode] = useState<"picture" | "video">("video");
  const [flash, setFlash] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(0);
  const [isZoomBadgeVisible, setIsZoomBadgeVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingBusy, setIsRecordingBusy] = useState(false);
  const [recordingDurationSec, setRecordingDurationSec] = useState(0);
  const opacity = useSharedValue(0.5);

  // Image transformation shared values
  const imageScale = useSharedValue(1);
  const imageTranslateX = useSharedValue(0);
  const imageTranslateY = useSharedValue(0);
  const imageRotation = useSharedValue(0);

  const savedImageScale = useSharedValue(1);
  const savedImageTranslateX = useSharedValue(0);
  const savedImageTranslateY = useSharedValue(0);
  const savedImageRotation = useSharedValue(0);

  // Drawing camera snapshot state
  const [cameraSnapshots, setCameraSnapshots] = useState<Snapshot[]>([]);
  const [snapshotUri, setSnapshotUri] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [targetPosition, setTargetPosition] = useState({ x: 0, y: 0 });
  const [activeVirtualSnapshotIndex, setActiveVirtualSnapshotIndex] =
    useState(0);
  const hasInitializedSnapshotIndex = useRef(false);

  const cameraRef = useRef<CameraView>(null);
  const snapshotButtonRef = useRef<View>(null);
  const pinchStartZoomRef = useRef(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const zoomBadgeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

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
        // Always start from the first snapshot.
        return 0;
      }

      return Math.min(currentIndex, virtualSnapshots.length - 1);
    });
  }, [virtualSnapshots, routeImageUri]);

  useFocusEffect(
    useCallback(() => {
      setFacing("back");
      setZoom(0);
      setIsZoomBadgeVisible(false);

      // Systematically re-request camera permission if not granted
      const checkAndRequest = async () => {
        const { status, canAskAgain } = await requestPermission();
        if (status !== "granted" && !canAskAgain) {
          // If definitively blocked, we at least show the permission view
          // but we've tried our best to auto-toggle the system prompt
        }
      };

      if (!permission?.granted) {
        void checkAndRequest();
      }
    }, [permission?.granted, requestPermission]),
  );

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (zoomBadgeTimeoutRef.current) {
        clearTimeout(zoomBadgeTimeoutRef.current);
      }
    };
  }, []);

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

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const toggleFlash = () => {
    setFlash((current) => !current);
  };

  const toggleLock = () => {
    setIsLocked((current) => !current);
  };

  const showZoomBadge = useCallback(() => {
    setIsZoomBadgeVisible(true);

    if (zoomBadgeTimeoutRef.current) {
      clearTimeout(zoomBadgeTimeoutRef.current);
    }

    zoomBadgeTimeoutRef.current = setTimeout(() => {
      setIsZoomBadgeVisible(false);
    }, 900);
  }, []);

  const handleZoomChange = useCallback(
    (nextZoom: number) => {
      const clampedZoom = Math.min(
        Math.max(nextZoom, MIN_CAMERA_ZOOM),
        MAX_CAMERA_ZOOM,
      );

      setZoom(clampedZoom);
      showZoomBadge();
    },
    [showZoomBadge],
  );

  const zoomGesture = Gesture.Pinch()
    .runOnJS(true)
    .onStart(() => {
      pinchStartZoomRef.current = zoom;
    })
    .onUpdate((event) => {
      handleZoomChange(
        pinchStartZoomRef.current +
          (event.scale - 1) * CAMERA_PINCH_SENSITIVITY,
      );
    });

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

  const handleSnapshot = async () => {
    if (isRecording || isRecordingBusy) {
      return;
    }

    let coords = { x: 0, y: 0 };
    if (snapshotButtonRef.current) {
      coords = await new Promise<{ x: number; y: number }>((resolve) => {
        snapshotButtonRef.current?.measure((x, y, w, h, pageX, pageY) => {
          resolve({ x: pageX + w / 2, y: pageY + h / 2 });
        });
      });
      setTargetPosition(coords);
    }

    try {
      if (cameraRef.current) {
        const normalizedUri = await takeNormalizedStoryPicture(
          cameraRef.current,
          {
            quality: 0.8,
            targetWidth: STORY_FRAME_WIDTH,
            targetHeight: STORY_FRAME_HEIGHT,
            fit: "contain",
          },
        );

        if (normalizedUri) {
          const newSnapshot: Snapshot = {
            id: Date.now().toString(),
            uri: normalizedUri,
            timestamp: Date.now(),
          };
          setCameraSnapshots((prev) => [...prev, newSnapshot]);
          setSnapshotUri(normalizedUri);
          setShowAnimation(true);
        }
      }
    } catch (error) {
      console.error("Snapshot failed", error);
    }
  };

  const handleComplete = async () => {
    if (isRecording || isRecordingBusy) {
      Toast.show({
        type: "info",
        text1: "Stop recording first",
        text2: "Finish the video recording before continuing.",
      });
      return;
    }

    const overlayImageUri =
      activeVirtualSnapshot?.uri ??
      (typeof routeImageUri === "string" ? routeImageUri : undefined);

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

  const startRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    setRecordingDurationSec(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingDurationSec((current) => current + 1);
    }, 1000);
  }, []);

  const stopRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const persistRecordedVideo = useCallback(
    async (videoUri: string) => {
      const originalReferenceUri =
        routeOriginalImageUri ??
        activeVirtualSnapshot?.uri ??
        (typeof routeImageUri === "string" ? routeImageUri : null);

      await persistLocalRecordingReference({
        assetId: `local-recording-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        assetUri: videoUri,
        sourceUri: videoUri,
        originalUri: originalReferenceUri,
      });

      try {
        await saveToArChitramAlbum(videoUri, ["photo", "video"]);
      } catch (galleryError) {
        console.warn(
          "[Canvas] Failed to save video to system gallery",
          galleryError,
        );
      }

      Toast.show({
        type: "success",
        text1: "Recording saved",
        text2: "Saved in the Recording tab.",
      });
    },
    [activeVirtualSnapshot?.uri, routeImageUri, routeOriginalImageUri],
  );

  const handleToggleRecording = useCallback(async () => {
    if (!permission?.granted) {
      const nextPermission = await requestPermission();
      if (nextPermission.status !== "granted") {
        return;
      }
    }

    const hasGalleryPermission = await requestVideoMediaPermissions();
    if (!hasGalleryPermission) {
      Toast.show({
        type: "error",
        text1: "Permission denied",
        text2: "Gallery access is required to save recordings.",
      });
      return;
    }

    if (isRecording) {
      cameraRef.current?.stopRecording();
      return;
    }

    if (isRecordingBusy) {
      return;
    }

    if (!cameraRef.current) {
      return;
    }

    try {
      setIsRecordingBusy(true);
      startRecordingTimer();
      setIsRecording(true);
      setIsRecordingBusy(false);

      const recordingResult = await cameraRef.current.recordAsync();
      if (recordingResult?.uri) {
        setIsRecordingBusy(true);
        await persistRecordedVideo(recordingResult.uri);
      }
    } catch (error) {
      console.error("Video recording failed", error);
      Toast.show({
        type: "error",
        text1: "Recording failed",
        text2: "Please try again.",
      });
    } finally {
      stopRecordingTimer();
      setIsRecording(false);
      setRecordingDurationSec(0);
      setIsRecordingBusy(false);
    }
  }, [
    cameraMode,
    isRecording,
    isRecordingBusy,
    permission?.granted,
    persistRecordedVideo,
    requestPermission,
    startRecordingTimer,
    stopRecordingTimer,
  ]);

  if (!permission) {
    return (
      <View
        style={[styles.permissionLoadingContainer, { backgroundColor: "#000" }]}
      >
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <CameraPermissionView
        canAskAgain={permission.canAskAgain}
        onRequestPermission={() => {
          void requestPermission();
        }}
      />
    );
  }

  return (
    <GestureHandlerRootView
      style={[styles.container, { paddingBottom: insets.bottom + 10 }]}
    >
      <View style={StyleSheet.absoluteFill}>
        <GestureDetector gesture={zoomGesture}>
          <View style={StyleSheet.absoluteFill}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={facing}
              enableTorch={flash}
              mode={cameraMode}
              mute
              animateShutter={false}
              ratio="16:9"
              zoom={zoom}
            />
          </View>
        </GestureDetector>
      </View>

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

      {isZoomBadgeVisible && (
        <Animated.View
          pointerEvents="none"
          entering={FadeIn.duration(140)}
          exiting={FadeOut.duration(180)}
          style={[
            styles.zoomBadgeAnchor,
            { top: Math.max(insets.top + (isLocked ? 18 : 72), 64) },
          ]}
        >
          <BlurView intensity={28} tint="dark" style={styles.zoomBadgeBlur}>
            <View style={styles.zoomBadge}>
              <Animated.Text style={styles.zoomBadgeText}>
                {(1 + zoom).toFixed(1)}x
              </Animated.Text>
            </View>
          </BlurView>
        </Animated.View>
      )}

      <View
        style={[styles.uiOverlay, { paddingTop: 0, paddingBottom: 0 }]}
        pointerEvents="box-none"
      >
        {!isLocked && <DrawingHeader onComplete={handleComplete} />}

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
              />
            </View>
          )}

          <DrawingToolbar
            onLock={toggleLock}
            onFlip={toggleCameraFacing}
            onFlash={toggleFlash}
            onRecord={handleToggleRecording}
            // onSnapshot={handleSnapshot}
            isLocked={isLocked}
            isRecording={isRecording}
            recordingDurationSec={recordingDurationSec}
            // snapshotCount={cameraSnapshots.length}
            // snapshotButtonRef={snapshotButtonRef}
            // onOpenPreview={() => setShowPreview(true)}
          />
        </View>
      </View>

      <ScreenshotCaptureAnimation
        visible={showAnimation}
        imageUri={snapshotUri}
        targetPosition={targetPosition}
        onAnimationComplete={() => setShowAnimation(false)}
      />

      <CapturePreviewModal
        visible={showPreview}
        onClose={() => setShowPreview(false)}
        snapshots={cameraSnapshots}
        onDelete={(id) => {
          setCameraSnapshots((prev) => prev.filter((s) => s.id !== id));
        }}
        onUpdateSnapshots={setCameraSnapshots}
        onReorder={() => {}}
      />
    </GestureHandlerRootView>
  );
};

export default Canvas;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  permissionLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  zoomBadgeAnchor: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 12,
    alignItems: "center",
  },
  zoomBadgeBlur: {
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  zoomBadge: {
    minWidth: 68,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(18,18,18,0.34)",
  },
  zoomBadgeText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 18,
    letterSpacing: 0.2,
    textAlign: "center",
  },
});
