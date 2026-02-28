import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
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
import { useStoryFrameSize } from "@/hooks/use-story-frame-size";
import { takeNormalizedStoryPicture } from "@/services/story-media-service";
import { useVirtualCreativityStore } from "@/store/virtual-creativity-store";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utiles/story-frame";

const AnimatedImage = Animated.createAnimatedComponent(Image);

const Canvas = () => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams();
  const sliderWidth = width - 210;
  const virtualSnapshots = useVirtualCreativityStore((state) => state.snapshots);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [flash, setFlash] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const opacity = useSharedValue(0.5);

  // Drawing camera snapshot state
  const [cameraSnapshots, setCameraSnapshots] = useState<Snapshot[]>([]);
  const [snapshotUri, setSnapshotUri] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [targetPosition, setTargetPosition] = useState({ x: 0, y: 0 });
  const [activeVirtualSnapshotIndex, setActiveVirtualSnapshotIndex] = useState(0);
  const hasInitializedSnapshotIndex = useRef(false);

  const cameraRef = useRef<CameraView>(null);
  const snapshotButtonRef = useRef<View>(null);

  const routeImageUri = Array.isArray(params.imageUri)
    ? params.imageUri[0]
    : params.imageUri;
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

  const handleSnapshot = async () => {
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
        const normalizedUri = await takeNormalizedStoryPicture(cameraRef.current, {
          quality: 0.8,
          targetWidth: STORY_FRAME_WIDTH,
          targetHeight: STORY_FRAME_HEIGHT,
          fit: "contain",
        });

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
    if (cameraSnapshots.length > 0) {
      const lastSnapshot = cameraSnapshots[cameraSnapshots.length - 1];
      router.push({
        pathname: "/drawing/preview",
        params: { imageUri: lastSnapshot.uri },
      });
    } else if (cameraRef.current) {
      try {
        const normalizedUri = await takeNormalizedStoryPicture(cameraRef.current, {
          quality: 1,
          targetWidth: STORY_FRAME_WIDTH,
          targetHeight: STORY_FRAME_HEIGHT,
          fit: "contain",
        });

        if (normalizedUri) {
          router.push({
            pathname: "/drawing/preview",
            params: { imageUri: normalizedUri },
          });
        }
      } catch (e) {
        console.error("Auto-snapshot failed", e);
        // Fallback
        router.push("/drawing/preview");
      }
    } else {
      router.push("/drawing/preview");
    }
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

  if (!permission) {
    return (
      <View style={[styles.permissionLoadingContainer, { backgroundColor: "#000" }]}>
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
    <GestureHandlerRootView style={styles.container}>
      <View style={StyleSheet.absoluteFill}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          enableTorch={flash}
          ratio="16:9"
        />
      </View>

      <View style={styles.imageOverlayWrapper}>
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
      </View>

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
            onRecord={handleSnapshot}
            isLocked={isLocked}
            snapshotCount={cameraSnapshots.length}
            snapshotButtonRef={snapshotButtonRef}
            onOpenPreview={() => setShowPreview(true)}
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
    pointerEvents: "none",
  },
  overlayImage: {
    borderRadius: 18,
    overflow: "hidden",
  },
});
