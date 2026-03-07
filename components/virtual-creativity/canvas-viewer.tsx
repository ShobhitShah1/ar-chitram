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
  BrushKind,
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
  currentBrushKind?: BrushKind;
  currentPatternUri?: string;
}

export const CanvasViewer: React.FC<CanvasViewerProps> = ({
  layers,
  activeLayerId,
  isZoomMode,
  currentColor,
  zoomResetKey = 0,
  currentBrushKind,
  currentPatternUri,
}) => {
  const updateLayer = useVirtualCreativityStore((state) => state.updateLayer);
  const bringToFront = useVirtualCreativityStore((state) => state.bringToFront);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  React.useEffect(() => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [
    activeLayerId,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    scale,
    translateX,
    translateY,
  ]);

  React.useEffect(() => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [
    zoomResetKey,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    scale,
    translateX,
    translateY,
  ]);

  const panGesture = Gesture.Pan()
    .enabled(isZoomMode)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    });

  const pinchGesture = Gesture.Pinch()
    .enabled(isZoomMode)
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
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

  const handleAddPath = React.useCallback(
    (path: DrawingPath, layerId: string) => {
      const targetLayer = layers.find((layer) => layer.id === layerId);
      if (!targetLayer) {
        return;
      }

      const nextPaths = [...(targetLayer.paths || []), path];
      updateLayer(layerId, { paths: nextPaths });
      if (layerId !== "main-image") {
        bringToFront(layerId, false);
      }
    },
    [bringToFront, layers, updateLayer],
  );

  if (!layers || layers.length === 0) {
    return <View style={styles.container} />;
  }

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

              <View
                style={StyleSheet.absoluteFill}
                pointerEvents={layer.id === activeLayerId ? "auto" : "none"}
              >
                <DrawingCanvas
                  paths={layer.paths || []}
                  isZoomMode={isZoomMode}
                  onAddPath={(path) => handleAddPath(path, layer.id)}
                  currentColor={currentColor}
                  brushKind={currentBrushKind}
                  patternUri={currentPatternUri}
                  enabled={layer.id === activeLayerId}
                  layerWidth={layer.width}
                  layerHeight={layer.height}
                  zoomScale={scale}
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
