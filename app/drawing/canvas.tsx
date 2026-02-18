import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { preview_1 } from "@/assets/images";
import DrawingHeader from "@/components/drawing/drawing-header";
import OpacitySlider from "@/components/drawing/opacity-slider";
import DrawingToolbar from "@/components/drawing/drawing-toolbar";
import HistoryControls from "@/components/drawing/history-controls";
import {
  CapturePreviewModal,
  Snapshot,
} from "@/components/drawing/capture-preview-modal";
import ScreenshotCaptureAnimation from "@/components/drawing/screenshot-capture-animation";
import { useVirtualCreativityStore } from "@/store/virtual-creativity-store";

const { width: screenWidth, height } = Dimensions.get("window");

const AnimatedImage = Animated.createAnimatedComponent(Image);

const Canvas = () => {
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
    : routeImageUri
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
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          skipProcessing: true,
        });

        if (photo?.uri) {
          const newSnapshot: Snapshot = {
            id: Date.now().toString(),
            uri: photo.uri,
            timestamp: Date.now(),
          };
          setCameraSnapshots((prev) => [...prev, newSnapshot]);
          setSnapshotUri(photo.uri);
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
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
        });

        if (photo?.uri) {
          router.push({
            pathname: "/drawing/preview",
            params: { imageUri: photo.uri },
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
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.message}>
          We need your permission to show the camera
        </Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permButton}>
          <Text style={styles.permButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
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
        />
      </View>

      <View style={styles.imageOverlayWrapper}>
        <AnimatedImage
          source={sketchImage}
          style={[styles.overlayImage, overlayStyle]}
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
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
  message: {
    textAlign: "center",
    paddingBottom: 20,
    color: "white",
  },
  permButton: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
  },
  permButtonText: {
    color: "white",
    fontSize: 16,
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
    width: screenWidth * 0.9,
    height: height * 0.7,
  },
});
