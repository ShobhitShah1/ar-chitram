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
  layer: VirtualLayer | undefined;
  isZoomMode: boolean;
  currentColor: string;
}

export const CanvasViewer: React.FC<CanvasViewerProps> = ({
  layer,
  isZoomMode,
  currentColor,
}) => {
  const updateLayer = useVirtualCreativityStore((state) => state.updateLayer);

  // View Transformation Values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Reset zoom when layer changes or zoom mode toggled off
  React.useEffect(() => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [layer?.id, isZoomMode]);

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

  const handleAddPath = (path: DrawingPath) => {
    if (layer) {
      const currentPaths = layer.paths || [];
      const newPaths = [...currentPaths, path];
      updateLayer(layer.id, { paths: newPaths });
    }
  };

  if (!layer) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.content, animatedStyle]}>
          <Image
            source={{ uri: layer.uri }}
            style={styles.image}
            contentFit="contain"
            // We might remove tintColor if we want to color OVER the image naturally
            // tintColor={layer.color}
          />
          {/* Drawing Overlay */}
          <View style={StyleSheet.absoluteFill}>
            {/* This view needs to be EXACTLY over the image content for coordinates to align */}
            {/* Since image is contentFit="contain", there might be empty space if aspect ratio differs */}
            {/* Ideally, we should measure the rendered image size. For now, assuming Full Fill due to Step 90 changes */}
            <DrawingCanvas
              layerId={layer.id}
              paths={layer.paths || []}
              isZoomMode={isZoomMode}
              onAddPath={handleAddPath}
              currentColor={currentColor}
            />
          </View>
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
