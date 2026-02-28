import React from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Image } from "expo-image";
import {
  DrawingPath,
  VirtualLayer,
  useVirtualCreativityStore,
} from "@/store/virtual-creativity-store";
import { DrawingCanvas } from "./drawing-canvas";

interface CanvasViewerProps {
  layers: VirtualLayer[];
  activeLayerId?: string | null;
  isZoomMode: boolean;
  currentColor: string;
  zoomResetKey?: number;
}

export const CanvasViewer: React.FC<CanvasViewerProps> = ({
  layers,
  activeLayerId,
  isZoomMode,
  currentColor,
  zoomResetKey = 0,
}) => {
  const updateLayer = useVirtualCreativityStore((state) => state.updateLayer);
  const bringToFront = useVirtualCreativityStore((state) => state.bringToFront);

  // View Transformation Values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Keep zoom state when toggling zoom mode. Reset only when layer focus changes.
  React.useEffect(() => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [activeLayerId]);

  // Explicit reset-to-fit trigger from long-press on zoom button.
  React.useEffect(() => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [zoomResetKey]);

  // Zoom/Pan Gestures
  const panGesture = Gesture.Pan()
    .enabled(isZoomMode)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      // Momentum or snap logic could go here
    });

  const pinchGesture = Gesture.Pinch()
    .enabled(isZoomMode)
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        // Snap back to original size if zoomed out
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleAddPath = (path: DrawingPath, layerId: string) => {
    const targetLayer = layers.find((l) => l.id === layerId);
    if (targetLayer) {
      const currentPaths = targetLayer.paths || [];
      const newPaths = [...currentPaths, path];
      updateLayer(layerId, { paths: newPaths });
      if (layerId !== "main-image") {
        bringToFront(layerId, false);
      }
    }
  };

  if (!layers || layers.length === 0) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.content, animatedStyle]}>
          {layers.map((layer) => (
            <View
              key={layer.id}
              style={StyleSheet.absoluteFill}
              pointerEvents="box-none"
            >
              <Image
                source={{ uri: layer.uri }}
                style={styles.image}
                contentFit="contain"
              />
              {/* Drawing Overlay */}
              <View
                style={StyleSheet.absoluteFill}
                pointerEvents={layer.id === activeLayerId ? "auto" : "none"}
              >
                <DrawingCanvas
                  layerId={layer.id}
                  paths={layer.paths || []}
                  isZoomMode={isZoomMode}
                  onAddPath={(p) => handleAddPath(p, layer.id)}
                  currentColor={currentColor}
                  enabled={layer.id === activeLayerId}
                  layerWidth={layer.width}
                  layerHeight={layer.height}
                />
              </View>
            </View>
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#ffffff", // Clean white background
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  content: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
