import React from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Image } from "expo-image";

import { doesDrawingPathHitPoint } from "@/services/drawing-hit-test-service";
import {
  getSmartFillErrorMessage,
  primeSmartFillLookup,
  resolveSmartFillRegion,
  type SmartFillSpace,
} from "@/services/smart-fill-path-service";
import {
  BrushKind,
  DrawingPath,
  SolidDrawMode,
  VirtualLayer,
  useVirtualCreativityStore,
} from "@/store/virtual-creativity-store";
import { DrawingCanvas } from "./drawing-canvas";

type CanvasPoint = {
  x: number;
  y: number;
};

interface CanvasViewerProps {
  layers: VirtualLayer[];
  activeLayerId?: string | null;
  isZoomMode: boolean;
  currentColor: string;
  zoomResetKey?: number;
  currentBrushKind?: BrushKind;
  currentPatternUri?: string;
  currentSolidMode?: SolidDrawMode;
}

export const CanvasViewer: React.FC<CanvasViewerProps> = ({
  layers,
  activeLayerId,
  isZoomMode,
  currentColor,
  zoomResetKey = 0,
  currentBrushKind,
  currentPatternUri,
  currentSolidMode = "free-draw",
}) => {
  const updateLayer = useVirtualCreativityStore((state) => state.updateLayer);
  const bringToFront = useVirtualCreativityStore((state) => state.bringToFront);
  const smartFillWarningShown = React.useRef(false);
  const eraseSessionRef = React.useRef<{
    layerId: string | null;
    historyCaptured: boolean;
  }>({
    layerId: null,
    historyCaptured: false,
  });
  const [activeSmartFillSpace, setActiveSmartFillSpace] =
    React.useState<SmartFillSpace | null>(null);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const reportSmartFillError = React.useCallback((error: unknown) => {
    if (smartFillWarningShown.current) {
      return;
    }

    smartFillWarningShown.current = true;
    console.warn(getSmartFillErrorMessage(error));
  }, []);

  const activeLayer = React.useMemo(
    () => layers.find((layer) => layer.id === activeLayerId) ?? null,
    [activeLayerId, layers],
  );
  const usesPatternBrush =
    currentBrushKind === "pattern" && !!currentPatternUri;
  const supportsSmartFillBrush =
    currentBrushKind === "solid" || usesPatternBrush;

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

  React.useEffect(() => {
    if (
      !activeLayer?.uri ||
      !supportsSmartFillBrush ||
      currentSolidMode === "free-draw" ||
      currentSolidMode === "erase"
    ) {
      setActiveSmartFillSpace(null);
      return;
    }

    let cancelled = false;

    void primeSmartFillLookup({ imageUri: activeLayer.uri })
      .then((space) => {
        if (!cancelled) {
          setActiveSmartFillSpace(space);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setActiveSmartFillSpace(null);
          reportSmartFillError(error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeLayer?.uri,
    currentSolidMode,
    reportSmartFillError,
    supportsSmartFillBrush,
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

  const getCurrentLayer = React.useCallback(
    (layerId: string) => {
      const currentLayers = useVirtualCreativityStore.getState().layers;
      return (
        currentLayers.find((layer) => layer.id === layerId) ??
        layers.find((layer) => layer.id === layerId) ??
        null
      );
    },
    [layers],
  );

  const handleAddPath = React.useCallback(
    (path: DrawingPath, layerId: string) => {
      const targetLayer = getCurrentLayer(layerId);
      if (!targetLayer) {
        return;
      }

      const nextPaths = [...(targetLayer.paths || []), path];
      updateLayer(layerId, { paths: nextPaths });
      if (layerId !== "main-image") {
        bringToFront(layerId, false);
      }
    },
    [bringToFront, getCurrentLayer, updateLayer],
  );

  const handleResolveSmartFillPath = React.useCallback(
    async (layerId: string, point: CanvasPoint) => {
      const targetLayer = getCurrentLayer(layerId);
      if (!targetLayer?.uri) {
        return null;
      }

      try {
        return await resolveSmartFillRegion({
          imageUri: targetLayer.uri,
          layerWidth: targetLayer.width,
          layerHeight: targetLayer.height,
          x: point.x,
          y: point.y,
        });
      } catch (error) {
        reportSmartFillError(error);
        return null;
      }
    },
    [getCurrentLayer, reportSmartFillError],
  );

  const handleTapFill = React.useCallback(
    async (layerId: string, point: CanvasPoint) => {
      const targetLayer = getCurrentLayer(layerId);
      if (!targetLayer) {
        return;
      }

      const region = await handleResolveSmartFillPath(layerId, point);
      if (!region?.path) {
        return;
      }

      const latestLayer = getCurrentLayer(layerId) ?? targetLayer;
      const isPatternFill = usesPatternBrush && !!currentPatternUri;
      const dedupedPaths = (latestLayer.paths || []).filter((path) => {
        const isSameRegion =
          path.path === region.path &&
          (path.pathSpaceWidth ?? 0) === region.width &&
          (path.pathSpaceHeight ?? 0) === region.height;
        const isFillPath =
          path.brushKind === "smart-fill" ||
          (path.brushKind === "pattern" &&
            !!path.patternUri &&
            path.strokeWidth <= 0);

        return !(isSameRegion && isFillPath);
      });

      updateLayer(layerId, {
        paths: [
          ...dedupedPaths,
          {
            id: Date.now().toString(),
            path: region.path,
            color: currentColor,
            strokeWidth: 0,
            brushKind: isPatternFill ? "pattern" : "smart-fill",
            patternUri: isPatternFill ? currentPatternUri : undefined,
            pathSpace: "image",
            pathSpaceWidth: region.width,
            pathSpaceHeight: region.height,
          },
        ],
      });

      if (layerId !== "main-image") {
        bringToFront(layerId, false);
      }
    },
    [
      bringToFront,
      currentColor,
      currentPatternUri,
      getCurrentLayer,
      handleResolveSmartFillPath,
      updateLayer,
      usesPatternBrush,
    ],
  );

  const beginEraseSession = React.useCallback((layerId: string) => {
    eraseSessionRef.current = {
      layerId,
      historyCaptured: false,
    };
  }, []);

  const endEraseSession = React.useCallback(() => {
    eraseSessionRef.current = {
      layerId: null,
      historyCaptured: false,
    };
  }, []);

  const handleEraseAt = React.useCallback(
    (layerId: string, point: CanvasPoint, radius: number) => {
      const targetLayer = getCurrentLayer(layerId);
      if (!targetLayer?.paths?.length) {
        return;
      }

      const nextPaths = targetLayer.paths.filter(
        (path) =>
          !doesDrawingPathHitPoint(
            path,
            point,
            radius,
            targetLayer.width,
            targetLayer.height,
          ),
      );

      if (nextPaths.length === targetLayer.paths.length) {
        return;
      }

      const shouldAddToHistory =
        !eraseSessionRef.current.historyCaptured ||
        eraseSessionRef.current.layerId !== layerId;

      updateLayer(layerId, { paths: nextPaths }, shouldAddToHistory);

      if (shouldAddToHistory) {
        eraseSessionRef.current = {
          layerId,
          historyCaptured: true,
        };
      }
    },
    [getCurrentLayer, updateLayer],
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
                  onSmartFill={(point) => handleTapFill(layer.id, point)}
                  onEraseSessionStart={() => beginEraseSession(layer.id)}
                  onEraseSessionEnd={endEraseSession}
                  onEraseAt={(point, radius) =>
                    handleEraseAt(layer.id, point, radius)
                  }
                  resolveSmartFillPath={(point) =>
                    handleResolveSmartFillPath(layer.id, point)
                  }
                  smartFillSpace={
                    layer.id === activeLayerId ? activeSmartFillSpace : null
                  }
                  currentColor={currentColor}
                  brushKind={currentBrushKind}
                  solidMode={currentSolidMode}
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
