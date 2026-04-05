import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Image } from "expo-image";

import { CanvasLayer } from "@/features/virtual-creativity/components/canvas-layer";
import { DrawingLayerSvg } from "@/features/virtual-creativity/components/drawing-layer-svg";
import { VirtualLayerVisual } from "@/features/virtual-creativity/components/layer-visual";
import { doesDrawingPathHitPoint } from "@/features/virtual-creativity/services/drawing-hit-test-service";
import { getSmartFillDisplayLayout } from "@/features/virtual-creativity/services/smart-fill-layout";
import {
  getSmartFillErrorMessage,
  primeSmartFillLookup,
  resolveCachedSmartFillRegion,
  resolveSmartFillRegion,
  type SmartFillSpace,
} from "@/features/virtual-creativity/services/smart-fill-path-service";
import {
  type BrushKind,
  type DrawingPath,
  type SolidDrawMode,
  type VirtualLayer,
  useVirtualCreativityStore,
} from "@/features/virtual-creativity/store/virtual-creativity-store";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utils/story-frame";

import { DrawingCanvas } from "./drawing-canvas";

type CanvasPoint = {
  x: number;
  y: number;
};

const VIEWPORT_RESET_SPRING = {
  damping: 24,
  stiffness: 220,
  mass: 0.6,
} as const;

interface CanvasViewerProps {
  layers: VirtualLayer[];
  activeLayerId?: string | null;
  selectedLayerId?: string | null;
  onSelectLayer?: (id: string | null) => void;
  onLongPressLayer?: (id: string) => void;
  onClearSelection?: () => void;
  onClearSelectionToDraw?: () => void;
  onExitFocusPlacement?: () => void;
  isZoomMode: boolean;
  currentColor: string;
  zoomResetKey?: number;
  currentBrushKind?: BrushKind;
  currentPatternUri?: string;
  currentSolidMode?: SolidDrawMode;
  handModeLayerIds?: ReadonlySet<string>;
  layerSelectionMode?: boolean;
  focusPlacementEnabled?: boolean;
  hideSelectionUI?: boolean;
  smartFillSpaces?: Record<string, SmartFillSpace>;
}

export const CanvasViewer: React.FC<CanvasViewerProps> = ({
  layers,
  activeLayerId,
  selectedLayerId,
  onSelectLayer,
  onLongPressLayer,
  onClearSelection,
  onClearSelectionToDraw,
  onExitFocusPlacement,
  isZoomMode,
  currentColor,
  zoomResetKey = 0,
  currentBrushKind,
  currentPatternUri,
  currentSolidMode = "free-draw",
  handModeLayerIds,
  layerSelectionMode = false,
  focusPlacementEnabled = false,
  hideSelectionUI = false,
  smartFillSpaces = {},
}) => {
  const updateLayer = useVirtualCreativityStore((state) => state.updateLayer);
  const smartFillWarningShown = React.useRef(false);
  const eraseSessionRef = React.useRef<{
    layerId: string | null;
    historyCaptured: boolean;
  }>({
    layerId: null,
    historyCaptured: false,
  });
  const [canvasSize, setCanvasSize] = React.useState({ width: 0, height: 0 });

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

  const sortedLayers = React.useMemo(
    () => [...layers].sort((a, b) => a.zIndex - b.zIndex),
    [layers],
  );

  const activeLayer = React.useMemo(
    () => sortedLayers.find((layer) => layer.id === activeLayerId) ?? null,
    [activeLayerId, sortedLayers],
  );
  const mainLayer = React.useMemo(
    () => sortedLayers.find((layer) => layer.id === "main-image") ?? null,
    [sortedLayers],
  );
  const isolatedEditingLayer = React.useMemo(() => {
    if (mainLayer || sortedLayers.length !== 1) {
      return null;
    }

    return sortedLayers[0];
  }, [mainLayer, sortedLayers]);
  const focusLayer = React.useMemo(
    () =>
      focusPlacementEnabled && sortedLayers.length === 1
        ? sortedLayers[0]
        : null,
    [focusPlacementEnabled, sortedLayers],
  );
  const focusStageScale = React.useMemo(() => {
    if (!focusLayer || canvasSize.width <= 0 || canvasSize.height <= 0) {
      return 1;
    }

    return Math.max(
      Math.min(
        canvasSize.width / Math.max(focusLayer.width, 1),
        canvasSize.height / Math.max(focusLayer.height, 1),
      ),
      0.0001,
    );
  }, [canvasSize.height, canvasSize.width, focusLayer]);
  const focusReferenceWidth = React.useMemo(() => {
    if (!focusLayer || focusStageScale <= 0) {
      return STORY_FRAME_WIDTH;
    }

    return canvasSize.width / focusStageScale;
  }, [canvasSize.width, focusLayer, focusStageScale]);
  const focusReferenceHeight = React.useMemo(() => {
    if (!focusLayer || focusStageScale <= 0) {
      return STORY_FRAME_HEIGHT;
    }

    return canvasSize.height / focusStageScale;
  }, [canvasSize.height, focusLayer, focusStageScale]);
  const isolatedStageScale = React.useMemo(() => {
    if (
      !isolatedEditingLayer ||
      canvasSize.width <= 0 ||
      canvasSize.height <= 0
    ) {
      return 1;
    }

    return Math.max(
      Math.min(
        canvasSize.width / Math.max(isolatedEditingLayer.width, 1),
        canvasSize.height / Math.max(isolatedEditingLayer.height, 1),
      ),
      0.0001,
    );
  }, [canvasSize.height, canvasSize.width, isolatedEditingLayer]);
  const isolatedReferenceWidth = React.useMemo(() => {
    if (!isolatedEditingLayer || isolatedStageScale <= 0) {
      return STORY_FRAME_WIDTH;
    }

    return canvasSize.width / isolatedStageScale;
  }, [canvasSize.width, isolatedEditingLayer, isolatedStageScale]);
  const isolatedReferenceHeight = React.useMemo(() => {
    if (!isolatedEditingLayer || isolatedStageScale <= 0) {
      return STORY_FRAME_HEIGHT;
    }

    return canvasSize.height / isolatedStageScale;
  }, [canvasSize.height, isolatedEditingLayer, isolatedStageScale]);
  const usesPatternBrush =
    currentBrushKind === "pattern" && !!currentPatternUri;
  const supportsSmartFillBrush =
    currentBrushKind === "solid" || usesPatternBrush;

  const stageLayout = React.useMemo(() => {
    if (canvasSize.width <= 0 || canvasSize.height <= 0) {
      return null;
    }

    return getSmartFillDisplayLayout(
      STORY_FRAME_WIDTH,
      STORY_FRAME_HEIGHT,
      canvasSize.width,
      canvasSize.height,
    );
  }, [canvasSize.height, canvasSize.width]);
  const mainLayerImageSource = React.useMemo(
    () => (mainLayer?.uri ? { uri: mainLayer.uri } : null),
    [mainLayer?.uri],
  );

  const isMainImageBlocking = React.useMemo(() => {
    if (activeLayerId === "main-image" || selectedLayerId === "main-image") {
      return true;
    }
    if (handModeLayerIds?.has("main-image")) {
      return true;
    }
    if (!handModeLayerIds || handModeLayerIds.size === 0) {
      return true;
    }
    return false;
  }, [activeLayerId, selectedLayerId, handModeLayerIds]);

  React.useEffect(() => {
    scale.value = withSpring(1, VIEWPORT_RESET_SPRING);
    translateX.value = withSpring(0, VIEWPORT_RESET_SPRING);
    translateY.value = withSpring(0, VIEWPORT_RESET_SPRING);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [
    activeLayerId,
    focusPlacementEnabled,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    scale,
    translateX,
    translateY,
  ]);

  React.useEffect(() => {
    scale.value = withSpring(1, VIEWPORT_RESET_SPRING);
    translateX.value = withSpring(0, VIEWPORT_RESET_SPRING);
    translateY.value = withSpring(0, VIEWPORT_RESET_SPRING);
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
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      const nextScale = savedScale.value * event.scale;
      const scaleRatio = nextScale / scale.value;

      // Smooth focal point zoom calculation
      translateX.value =
        event.focalX - (event.focalX - translateX.value) * scaleRatio;
      translateY.value =
        event.focalY - (event.focalY - translateY.value) * scaleRatio;

      scale.value = nextScale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1, VIEWPORT_RESET_SPRING);
        translateX.value = withSpring(0, VIEWPORT_RESET_SPRING);
        translateY.value = withSpring(0, VIEWPORT_RESET_SPRING);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedScale.value = scale.value;
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      }
    });

  const stageTapGesture = Gesture.Tap().onStart(() => {
    if (onSelectLayer && !isolatedEditingLayer) {
      runOnJS(onSelectLayer)(null);
    }
  });
  const composedGesture = Gesture.Simultaneous(
    panGesture,
    pinchGesture,
    stageTapGesture,
  );

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
        sortedLayers.find((layer) => layer.id === layerId) ??
        null
      );
    },
    [sortedLayers],
  );

  const handleAddPath = React.useCallback(
    (path: DrawingPath, layerId: string) => {
      const targetLayer = getCurrentLayer(layerId);
      if (!targetLayer) {
        return;
      }

      const nextPaths = [...(targetLayer.paths || []), path];
      updateLayer(layerId, { paths: nextPaths });
    },
    [getCurrentLayer, updateLayer],
  );

  const handleResolveSmartFillPath = React.useCallback(
    async (layerId: string, point: CanvasPoint) => {
      const targetLayer = getCurrentLayer(layerId);
      if (!targetLayer?.uri) {
        return null;
      }

      const cachedRegion = resolveCachedSmartFillRegion({
        imageUri: targetLayer.uri,
        layerWidth: targetLayer.width,
        layerHeight: targetLayer.height,
        x: point.x,
        y: point.y,
      });

      if (cachedRegion) {
        return cachedRegion;
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
      if (!region?.path || region.touchesEdge) {
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
    },
    [
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

  const handleCanvasLayout = React.useCallback(
    (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const nextWidth = Math.round(event.nativeEvent.layout.width);
      const nextHeight = Math.round(event.nativeEvent.layout.height);

      setCanvasSize((current) => {
        if (current.width === nextWidth && current.height === nextHeight) {
          return current;
        }

        return {
          width: nextWidth,
          height: nextHeight,
        };
      });
    },
    [],
  );

  const renderDrawingSurface = React.useCallback(
    (layer: VirtualLayer) => (
      <View style={StyleSheet.absoluteFill} pointerEvents="auto">
        <DrawingCanvas
          paths={layer.paths || []}
          isZoomMode={isZoomMode}
          onAddPath={(path) => handleAddPath(path, layer.id)}
          onSmartFill={(point) => handleTapFill(layer.id, point)}
          onEraseSessionStart={() => beginEraseSession(layer.id)}
          onEraseSessionEnd={endEraseSession}
          onEraseAt={(point, radius) => handleEraseAt(layer.id, point, radius)}
          resolveSmartFillPath={(point) =>
            handleResolveSmartFillPath(layer.id, point)
          }
          smartFillSpace={smartFillSpaces[layer.id] || null}
          onSelectLayer={onSelectLayer}
          currentColor={currentColor}
          brushKind={currentBrushKind}
          solidMode={currentSolidMode}
          patternUri={currentPatternUri}
          enabled
          layerWidth={layer.width}
          layerHeight={layer.height}
          zoomScale={scale}
        />
      </View>
    ),
    [
      activeLayerId,
      beginEraseSession,
      currentBrushKind,
      currentColor,
      currentPatternUri,
      currentSolidMode,
      endEraseSession,
      handleAddPath,
      handleEraseAt,
      handleResolveSmartFillPath,
      handleTapFill,
      isZoomMode,
      scale,
      smartFillSpaces,
    ],
  );

  const renderLegacyScene = () => {
    if (focusLayer) {
      return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {onExitFocusPlacement ? (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={onExitFocusPlacement}
            />
          ) : null}
          <CanvasLayer
            layer={focusLayer}
            canvasWidth={focusReferenceWidth}
            canvasHeight={focusReferenceHeight}
            stageScale={focusStageScale}
            renderReferenceWidth={focusReferenceWidth}
            renderReferenceHeight={focusReferenceHeight}
            isActiveEditable={false}
            gesturesEnabled={!isZoomMode}
            enablePinchResize={false}
            zoomScale={scale}
            isZoomMode={isZoomMode}
          />
        </View>
      );
    }

    return (
      <>
        {sortedLayers.map((layer) => {
          const isLayerCanvasEnabled =
            activeLayerId != null &&
            (layer.id === "main-image"
              ? true
              : !handModeLayerIds?.has(layer.id) && layer.type !== "text");
          const isTextLayer = layer.type === "text";

          return (
            <View
              key={layer.id}
              style={StyleSheet.absoluteFill}
              pointerEvents="box-none"
            >
              <VirtualLayerVisual layer={layer} />

              {!isTextLayer && !isLayerCanvasEnabled ? (
                <DrawingLayerSvg
                  idPrefix={`legacy-${layer.id}`}
                  paths={layer.paths || []}
                  layerWidth={layer.width}
                  layerHeight={layer.height}
                />
              ) : null}

              {isLayerCanvasEnabled ? renderDrawingSurface(layer) : null}
            </View>
          );
        })}
      </>
    );
  };

  if (!layers || layers.length === 0) {
    return <View style={styles.container} />;
  }

  const isDrawEnabledGlobally = activeLayerId !== null;
  const isMainCanvasEnabled = !!mainLayer && isDrawEnabledGlobally;
  return (
    <View style={styles.container} onLayout={handleCanvasLayout}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.content, animatedStyle]}>
          {isolatedEditingLayer ? (
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
              <CanvasLayer
                layer={{
                  ...isolatedEditingLayer,
                  x: 0,
                  y: 0,
                  scale: 1,
                  rotation: 0,
                }}
                canvasWidth={isolatedReferenceWidth}
                canvasHeight={isolatedReferenceHeight}
                stageScale={isolatedStageScale}
                renderReferenceWidth={isolatedReferenceWidth}
                renderReferenceHeight={isolatedReferenceHeight}
                isActiveEditable={activeLayerId === isolatedEditingLayer.id}
                onLongPress={
                  onLongPressLayer
                    ? () => onLongPressLayer(isolatedEditingLayer.id)
                    : undefined
                }
                gesturesEnabled={false}
                enablePinchResize={false}
                zoomScale={scale}
                isZoomMode={isZoomMode}
                currentColor={currentColor}
                currentBrushKind={currentBrushKind}
                currentPatternUri={currentPatternUri}
                currentSolidMode={currentSolidMode}
                smartFillSpace={
                  smartFillSpaces[isolatedEditingLayer.id] || null
                }
                onAddPath={(path) =>
                  handleAddPath(path, isolatedEditingLayer.id)
                }
                isIsolated={!!isolatedEditingLayer}
                onTapFill={(point) =>
                  handleTapFill(isolatedEditingLayer.id, point)
                }
                onEraseSessionStart={() =>
                  beginEraseSession(isolatedEditingLayer.id)
                }
                onEraseSessionEnd={endEraseSession}
                onEraseAt={(point, radius) =>
                  handleEraseAt(isolatedEditingLayer.id, point, radius)
                }
                resolveSmartFillPath={(point) =>
                  handleResolveSmartFillPath(isolatedEditingLayer.id, point)
                }
              />
            </View>
          ) : stageLayout ? (
            <View
              style={[
                styles.stage,
                {
                  left: stageLayout.offsetX,
                  top: stageLayout.offsetY,
                  width: stageLayout.renderedWidth,
                  height: stageLayout.renderedHeight,
                },
              ]}
            >
              <View
                style={StyleSheet.absoluteFill}
                pointerEvents={sortedLayers.length > 0 ? "box-none" : "none"}
              >
                {sortedLayers.map((layer) =>
                  layer.id === "main-image" ? (
                    <View
                      key={layer.id}
                      style={[
                        StyleSheet.absoluteFill,
                        { zIndex: layer.zIndex },
                      ]}
                      pointerEvents={isMainImageBlocking ? "box-none" : "none"}
                    >
                      {mainLayerImageSource ? (
                        <Image
                          source={mainLayerImageSource}
                          style={styles.image}
                          contentFit="contain"
                          transition={0}
                        />
                      ) : null}

                      {!isMainCanvasEnabled ? (
                        <DrawingLayerSvg
                          idPrefix={`stage-${layer.id}`}
                          paths={layer.paths || []}
                          layerWidth={layer.width}
                          layerHeight={layer.height}
                        />
                      ) : null}

                      {isMainCanvasEnabled ? renderDrawingSurface(layer) : null}
                    </View>
                  ) : (
                    <CanvasLayer
                      key={layer.id}
                      layer={layer}
                      canvasWidth={STORY_FRAME_WIDTH}
                      canvasHeight={STORY_FRAME_HEIGHT}
                      stageScale={stageLayout.scale}
                      isActiveEditable={
                        isDrawEnabledGlobally &&
                        layer.type !== "text" &&
                        !handModeLayerIds?.has(layer.id)
                      }
                      onLongPress={
                        onLongPressLayer
                          ? () => onLongPressLayer(layer.id)
                          : undefined
                      }
                      gesturesEnabled={
                        !isZoomMode && (
                          layer.type === "text"
                            ? selectedLayerId === layer.id
                            : !!handModeLayerIds?.has(layer.id)
                        )
                      }
                      enablePinchResize={
                        !isZoomMode && (
                          layer.type === "text"
                            ? selectedLayerId === layer.id
                            : !!handModeLayerIds?.has(layer.id)
                        )
                      }
                      isSelected={selectedLayerId === layer.id}
                      zoomScale={scale}
                      isZoomMode={isZoomMode}
                      currentColor={currentColor}
                      currentBrushKind={currentBrushKind}
                      currentPatternUri={currentPatternUri}
                      currentSolidMode={currentSolidMode}
                      smartFillSpace={smartFillSpaces[layer.id] || null}
                      onAddPath={(path) => handleAddPath(path, layer.id)}
                      onSelectLayer={onSelectLayer}
                      onTapFill={(point) => handleTapFill(layer.id, point)}
                      onEraseSessionStart={() => beginEraseSession(layer.id)}
                      onEraseSessionEnd={endEraseSession}
                      onEraseAt={(point, radius) =>
                        handleEraseAt(layer.id, point, radius)
                      }
                      resolveSmartFillPath={(point) =>
                        handleResolveSmartFillPath(layer.id, point)
                      }
                    />
                  ),
                )}
              </View>
            </View>
          ) : (
            renderLegacyScene()
          )}
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
  stage: {
    position: "absolute",
    overflow: "visible",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
