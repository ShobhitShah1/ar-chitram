import React from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  type SharedValue,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { LayerSelectionChrome } from "@/features/virtual-creativity/components/canvas/layer-selection-chrome";
import { DrawingCanvas } from "@/features/virtual-creativity/components/drawing-canvas";
import { DrawingLayerSvg } from "@/features/virtual-creativity/components/drawing-layer-svg";
import { VirtualLayerVisual } from "@/features/virtual-creativity/components/layer-visual";
import type {
  SmartFillRegion,
  SmartFillSpace,
} from "@/features/virtual-creativity/services/smart-fill-path-service";
import {
  clampLayerAxisPosition,
  getLayerDisplayFrame,
  getMaxFitScale,
  getResizeScaleDelta,
  MIN_LAYER_SCALE,
} from "@/features/virtual-creativity/services/virtual-layer-transform";
import { getVirtualLayerRenderMetrics } from "@/features/virtual-creativity/services/virtual-layer-service";
import {
  type BrushKind,
  type DrawingPath,
  type SolidDrawMode,
  type VirtualLayer,
  useVirtualCreativityStore,
} from "@/features/virtual-creativity/store/virtual-creativity-store";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utils/story-frame";

type CanvasPoint = {
  x: number;
  y: number;
};

type ResizeHandleCorner = "topLeft" | "bottomRight";
const TRANSFORM_COMMIT_EPSILON = 0.001;
const LAYER_SYNC_SPRING = {
  damping: 24,
  stiffness: 240,
  mass: 0.6,
} as const;

interface CanvasLayerProps {
  layer: VirtualLayer;
  canvasWidth?: number;
  canvasHeight?: number;
  stageScale: number;
  displayZIndex?: number;
  isActiveEditable?: boolean;
  onLongPress?: () => void;
  gesturesEnabled?: boolean;
  enablePinchResize?: boolean;
  zoomScale?: SharedValue<number>;
  isZoomMode?: boolean;
  currentColor?: string;
  currentBrushKind?: BrushKind;
  currentPatternUri?: string;
  currentSolidMode?: SolidDrawMode;
  smartFillSpace?: SmartFillSpace | null;
  onAddPath?: (path: DrawingPath) => void;
  onSelectLayer?: (id: string | null) => void;
  isSelected?: boolean;
  onTapFill?: (point: CanvasPoint) => void | Promise<void>;
  onEraseSessionStart?: () => void;
  onEraseSessionEnd?: () => void;
  onEraseAt?: (point: CanvasPoint, radius: number) => void;
  resolveSmartFillPath?: (
    point: CanvasPoint,
  ) => Promise<SmartFillRegion | null>;
  renderReferenceWidth?: number;
  renderReferenceHeight?: number;
}

const deferCallback = (callback?: () => void) => {
  if (!callback) {
    return;
  }

  requestAnimationFrame(() => {
    callback();
  });
};

const getDiagonalDelta = (translationX: number, translationY: number) => {
  "worklet";
  return (translationX + translationY) / 2;
};

const clampLayerXPosition = ({
  canvasWidth,
  layerWidth,
  maxFitScale,
  nextScale,
  nextX,
}: {
  canvasWidth: number;
  layerWidth: number;
  maxFitScale: number;
  nextScale: number;
  nextX: number;
}) => {
  "worklet";

  return clampLayerAxisPosition({
    canvasSize: canvasWidth,
    layerSize: layerWidth,
    maxFitScale,
    nextPosition: nextX,
    nextScale,
  });
};

const clampLayerYPosition = ({
  canvasHeight,
  layerHeight,
  maxFitScale,
  nextScale,
  nextY,
}: {
  canvasHeight: number;
  layerHeight: number;
  maxFitScale: number;
  nextScale: number;
  nextY: number;
}) => {
  "worklet";

  return clampLayerAxisPosition({
    canvasSize: canvasHeight,
    layerSize: layerHeight,
    maxFitScale,
    nextPosition: nextY,
    nextScale,
  });
};

const commitLayerTransform = ({
  canvasHeight,
  canvasWidth,
  layerHeight,
  layerId,
  layerWidth,
  maxFitScale,
  nextRotation,
  nextScale,
  nextX,
  nextY,
}: {
  canvasHeight: number;
  canvasWidth: number;
  layerHeight: number;
  layerId: string;
  layerWidth: number;
  maxFitScale: number;
  nextRotation: number;
  nextScale: number;
  nextX: number;
  nextY: number;
}) => {
  requestAnimationFrame(() => {
    const fittedScale = Math.min(nextScale, maxFitScale);
    const { layers, updateLayer } = useVirtualCreativityStore.getState();
    const currentLayer = layers.find((candidate) => candidate.id === layerId);
    const clampedX = clampLayerXPosition({
      canvasWidth,
      layerWidth,
      maxFitScale,
      nextScale: fittedScale,
      nextX,
    });
    const clampedY = clampLayerYPosition({
      canvasHeight,
      layerHeight,
      maxFitScale,
      nextScale: fittedScale,
      nextY,
    });

    if (
      currentLayer &&
      Math.abs(currentLayer.x - clampedX) < TRANSFORM_COMMIT_EPSILON &&
      Math.abs(currentLayer.y - clampedY) < TRANSFORM_COMMIT_EPSILON &&
      Math.abs(currentLayer.scale - fittedScale) < TRANSFORM_COMMIT_EPSILON &&
      Math.abs(currentLayer.rotation - nextRotation) < TRANSFORM_COMMIT_EPSILON
    ) {
      return;
    }

    updateLayer(layerId, {
      x: clampedX,
      y: clampedY,
      scale: fittedScale,
      rotation: nextRotation,
    });
  });
};

export const CanvasLayer = React.memo<CanvasLayerProps>(
  ({
    layer,
    canvasWidth = STORY_FRAME_WIDTH,
    canvasHeight = STORY_FRAME_HEIGHT,
    stageScale,
    displayZIndex,
    isActiveEditable = false,
    onLongPress,
    gesturesEnabled = true,
    enablePinchResize = false,
    zoomScale,
    isZoomMode = false,
    currentColor = "#000000",
    currentBrushKind,
    currentPatternUri,
    currentSolidMode = "free-draw",
    smartFillSpace = null,
    onAddPath,
    onSelectLayer,
    isSelected = false,
    onTapFill,
    onEraseSessionStart,
    onEraseSessionEnd,
    onEraseAt,
    resolveSmartFillPath,
    renderReferenceWidth = STORY_FRAME_WIDTH,
    renderReferenceHeight = STORY_FRAME_HEIGHT,
  }) => {
    const isTextLayer = layer.type === "text";
    const translateX = useSharedValue(layer.x);
    const translateY = useSharedValue(layer.y);
    const scale = useSharedValue(layer.scale);
    const rotation = useSharedValue(layer.rotation);

    const startX = useSharedValue(layer.x);
    const startY = useSharedValue(layer.y);
    const startScale = useSharedValue(layer.scale);
    const startRotation = useSharedValue(layer.rotation);

    const layerTapGesture = React.useMemo(
      () =>
        Gesture.Tap()
          .maxDistance(10)
          .onEnd((_event, success) => {
            if (!success || !onSelectLayer) {
              return;
            }

            runOnJS(onSelectLayer)(isSelected ? null : layer.id);
          }),
      [layer.id, onSelectLayer, isSelected],
    );

    const maxFitScale = React.useMemo(
      () =>
        getMaxFitScale({
          canvasHeight,
          canvasWidth,
          layerHeight: layer.height,
          layerWidth: layer.width,
        }),
      [canvasHeight, canvasWidth, layer.height, layer.width],
    );

    React.useEffect(() => {
      const nextScale = Math.min(layer.scale, maxFitScale);
      const nextX = clampLayerXPosition({
        canvasWidth,
        layerWidth: layer.width,
        maxFitScale,
        nextScale,
        nextX: layer.x,
      });
      const nextY = clampLayerYPosition({
        canvasHeight,
        layerHeight: layer.height,
        maxFitScale,
        nextScale,
        nextY: layer.y,
      });

      translateX.value = withSpring(nextX, LAYER_SYNC_SPRING);
      translateY.value = withSpring(nextY, LAYER_SYNC_SPRING);
      scale.value = withSpring(nextScale, LAYER_SYNC_SPRING);
      rotation.value = withSpring(layer.rotation, LAYER_SYNC_SPRING);
      startX.value = nextX;
      startY.value = nextY;
      startScale.value = nextScale;
      startRotation.value = layer.rotation;
    }, [
      canvasHeight,
      canvasWidth,
      layer.rotation,
      layer.scale,
      layer.height,
      layer.width,
      layer.x,
      layer.y,
      maxFitScale,
      rotation,
      scale,
      startRotation,
      startScale,
      startX,
      startY,
      translateX,
      translateY,
    ]);

    const queueLongPress = React.useCallback(() => {
      deferCallback(onLongPress);
    }, [onLongPress]);

    const canLongPress = !!onLongPress && !isZoomMode;

    const longPressGesture = React.useMemo(
      () =>
        Gesture.LongPress()
          .enabled(canLongPress)
          .minDuration(320)
          .maxDistance(12)
          .onStart((_event) => {
            "worklet";
            runOnJS(queueLongPress)();
          }),
      [canLongPress, queueLongPress],
    );

    const panGesture = React.useMemo(
      () =>
        Gesture.Pan()
          .enabled(gesturesEnabled)
          .minDistance(4)
          .maxPointers(1)
          .shouldCancelWhenOutside(false)
          .onStart(() => {
            startX.value = translateX.value;
            startY.value = translateY.value;
          })
          .onUpdate((event) => {
            const currentZoom = zoomScale ? zoomScale.value : 1;
            const nextX =
              startX.value + event.translationX / (stageScale * currentZoom);
            const nextY =
              startY.value + event.translationY / (stageScale * currentZoom);

            translateX.value = clampLayerXPosition({
              canvasWidth,
              layerWidth: layer.width,
              maxFitScale,
              nextScale: scale.value,
              nextX,
            });
            translateY.value = clampLayerYPosition({
              canvasHeight,
              layerHeight: layer.height,
              maxFitScale,
              nextScale: scale.value,
              nextY,
            });
          })
          .onFinalize(() => {
            const nextScale = Math.min(scale.value, maxFitScale);
            const nextX = clampLayerXPosition({
              canvasWidth,
              layerWidth: layer.width,
              maxFitScale,
              nextScale,
              nextX: translateX.value,
            });
            const nextY = clampLayerYPosition({
              canvasHeight,
              layerHeight: layer.height,
              maxFitScale,
              nextScale,
              nextY: translateY.value,
            });
            const nextRotation = rotation.value;

            translateX.value = nextX;
            translateY.value = nextY;
            scale.value = nextScale;
            startX.value = nextX;
            startY.value = nextY;
            runOnJS(commitLayerTransform)({
              canvasHeight,
              canvasWidth,
              layerHeight: layer.height,
              layerId: layer.id,
              layerWidth: layer.width,
              maxFitScale,
              nextRotation,
              nextScale,
              nextX,
              nextY,
            });
          }),
      [
        canvasHeight,
        canvasWidth,
        gesturesEnabled,
        layer.height,
        layer.id,
        layer.width,
        maxFitScale,
        rotation,
        scale,
        stageScale,
        startX,
        startY,
        translateX,
        translateY,
        zoomScale,
      ],
    );

    const pinchGesture = React.useMemo(
      () =>
        Gesture.Pinch()
          .enabled(gesturesEnabled && enablePinchResize)
          .onStart(() => {
            startScale.value = scale.value;
          })
          .onUpdate((event) => {
            const nextScale = Math.max(
              MIN_LAYER_SCALE,
              Math.min(startScale.value * event.scale, maxFitScale),
            );

            scale.value = nextScale;
            translateX.value = clampLayerXPosition({
              canvasWidth,
              layerWidth: layer.width,
              maxFitScale,
              nextScale,
              nextX: translateX.value,
            });
            translateY.value = clampLayerYPosition({
              canvasHeight,
              layerHeight: layer.height,
              maxFitScale,
              nextScale,
              nextY: translateY.value,
            });
          })
          .onFinalize(() => {
            const nextScale = Math.min(scale.value, maxFitScale);
            const nextX = clampLayerXPosition({
              canvasWidth,
              layerWidth: layer.width,
              maxFitScale,
              nextScale,
              nextX: translateX.value,
            });
            const nextY = clampLayerYPosition({
              canvasHeight,
              layerHeight: layer.height,
              maxFitScale,
              nextScale,
              nextY: translateY.value,
            });
            const nextRotation = rotation.value;

            scale.value = nextScale;
            translateX.value = nextX;
            translateY.value = nextY;
            startScale.value = nextScale;
            startX.value = nextX;
            startY.value = nextY;
            runOnJS(commitLayerTransform)({
              canvasHeight,
              canvasWidth,
              layerHeight: layer.height,
              layerId: layer.id,
              layerWidth: layer.width,
              maxFitScale,
              nextRotation,
              nextScale,
              nextX,
              nextY,
            });
          }),
      [
        canvasHeight,
        canvasWidth,
        enablePinchResize,
        gesturesEnabled,
        layer.height,
        layer.id,
        layer.width,
        maxFitScale,
        rotation,
        scale,
        startScale,
        startX,
        startY,
        translateX,
        translateY,
      ],
    );

    const rotationGesture = React.useMemo(
      () =>
        Gesture.Rotation()
          .enabled(gesturesEnabled)
          .onStart(() => {
            startRotation.value = rotation.value;
          })
          .onUpdate((event) => {
            rotation.value = startRotation.value + event.rotation;
          })
          .onFinalize(() => {
            const nextScale = Math.min(scale.value, maxFitScale);
            const nextX = clampLayerXPosition({
              canvasWidth,
              layerWidth: layer.width,
              maxFitScale,
              nextScale,
              nextX: translateX.value,
            });
            const nextY = clampLayerYPosition({
              canvasHeight,
              layerHeight: layer.height,
              maxFitScale,
              nextScale,
              nextY: translateY.value,
            });
            const nextRotation = rotation.value;

            translateX.value = nextX;
            translateY.value = nextY;
            scale.value = nextScale;
            startX.value = nextX;
            startY.value = nextY;
            startRotation.value = nextRotation;
            runOnJS(commitLayerTransform)({
              canvasHeight,
              canvasWidth,
              layerHeight: layer.height,
              layerId: layer.id,
              layerWidth: layer.width,
              maxFitScale,
              nextRotation,
              nextScale,
              nextX,
              nextY,
            });
          }),
      [
        canvasHeight,
        canvasWidth,
        gesturesEnabled,
        layer.height,
        layer.id,
        layer.width,
        maxFitScale,
        rotation,
        scale,
        startRotation,
        startX,
        startY,
        translateX,
        translateY,
      ],
    );

    const createResizeGesture = React.useCallback(
      (corner: ResizeHandleCorner) =>
        Gesture.Pan()
          .enabled(gesturesEnabled)
          .minDistance(0)
          .blocksExternalGesture(panGesture)
          .blocksExternalGesture(pinchGesture)
          .blocksExternalGesture(rotationGesture)
          .shouldCancelWhenOutside(false)
          .onStart(() => {
            startScale.value = scale.value;
          })
          .onUpdate((event) => {
            const currentZoom = zoomScale ? zoomScale.value : 1;
            const rawDelta = getDiagonalDelta(
              event.translationX,
              event.translationY,
            );
            const direction = corner === "bottomRight" ? 1 : -1;
            const scaleDelta = getResizeScaleDelta({
              canvasHeight,
              canvasWidth,
              currentZoom,
              direction,
              rawDelta,
              stageScale,
            });
            const nextScale = Math.max(
              MIN_LAYER_SCALE,
              Math.min(startScale.value + scaleDelta, maxFitScale),
            );

            scale.value = nextScale;
            translateX.value = clampLayerXPosition({
              canvasWidth,
              layerWidth: layer.width,
              maxFitScale,
              nextScale,
              nextX: translateX.value,
            });
            translateY.value = clampLayerYPosition({
              canvasHeight,
              layerHeight: layer.height,
              maxFitScale,
              nextScale,
              nextY: translateY.value,
            });
          })
          .onFinalize(() => {
            const nextScale = Math.min(scale.value, maxFitScale);
            const nextX = clampLayerXPosition({
              canvasWidth,
              layerWidth: layer.width,
              maxFitScale,
              nextScale,
              nextX: translateX.value,
            });
            const nextY = clampLayerYPosition({
              canvasHeight,
              layerHeight: layer.height,
              maxFitScale,
              nextScale,
              nextY: translateY.value,
            });
            const nextRotation = rotation.value;

            scale.value = nextScale;
            translateX.value = nextX;
            translateY.value = nextY;
            startScale.value = nextScale;
            startX.value = nextX;
            startY.value = nextY;
            runOnJS(commitLayerTransform)({
              canvasHeight,
              canvasWidth,
              layerHeight: layer.height,
              layerId: layer.id,
              layerWidth: layer.width,
              maxFitScale,
              nextRotation,
              nextScale,
              nextX,
              nextY,
            });
          }),
      [
        canvasHeight,
        canvasWidth,
        gesturesEnabled,
        layer.height,
        layer.id,
        layer.width,
        maxFitScale,
        panGesture,
        pinchGesture,
        rotation,
        rotationGesture,
        scale,
        stageScale,
        startScale,
        startX,
        startY,
        translateX,
        translateY,
        zoomScale,
      ],
    );

    const resizeGestures = React.useMemo(
      () => ({
        topLeft: createResizeGesture("topLeft"),
        bottomRight: createResizeGesture("bottomRight"),
      }),
      [createResizeGesture],
    );

    const transformGesture = React.useMemo(
      () => Gesture.Simultaneous(panGesture, pinchGesture, rotationGesture),
      [panGesture, pinchGesture, rotationGesture],
    );

    const layerGesture = React.useMemo(
      () =>
        Gesture.Race(
          longPressGesture,
          Gesture.Simultaneous(layerTapGesture, transformGesture),
        ),
      [longPressGesture, layerTapGesture, transformGesture],
    );

    const metrics = React.useMemo(
      () =>
        getVirtualLayerRenderMetrics(
          layer,
          stageScale,
          renderReferenceWidth,
          renderReferenceHeight,
        ),
      [layer, renderReferenceHeight, renderReferenceWidth, stageScale],
    );

    const visualFrameStyle = useAnimatedStyle(() => {
      const frame = getLayerDisplayFrame({
        baseHeight: metrics.height,
        baseLeft: metrics.baseLeft,
        baseTop: metrics.baseTop,
        baseWidth: metrics.width,
        scale: scale.value,
        stageScale,
        translateX: translateX.value,
        translateY: translateY.value,
      });

      return {
        ...frame,
        zIndex: displayZIndex ?? layer.zIndex,
      };
    }, [
      displayZIndex,
      layer.zIndex,
      metrics,
      scale,
      stageScale,
      translateX,
      translateY,
    ]);

    const rotatedContentStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${rotation.value}rad` }],
    }));

    const shouldShowDrawingCanvas =
      !isTextLayer && isActiveEditable && !gesturesEnabled;
    const showPlacementUI = gesturesEnabled && isSelected;
    const shouldCaptureTouches =
      shouldShowDrawingCanvas ||
      gesturesEnabled ||
      !!onLongPress;

    const renderLayerContent = () => (
      <View style={styles.frame}>
        <VirtualLayerVisual layer={layer} />

        {!isTextLayer && !shouldShowDrawingCanvas ? (
          <DrawingLayerSvg
            idPrefix={`canvas-layer-${layer.id}`}
            paths={layer.paths || []}
            layerWidth={layer.width}
            layerHeight={layer.height}
          />
        ) : null}

        {shouldShowDrawingCanvas ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="auto">
            <DrawingCanvas
              paths={layer.paths || []}
              isZoomMode={isZoomMode}
              onAddPath={(path) => {
                onAddPath?.(path);
              }}
              onSmartFill={onTapFill}
              onEraseSessionStart={onEraseSessionStart}
              onEraseSessionEnd={onEraseSessionEnd}
              onEraseAt={onEraseAt}
              resolveSmartFillPath={resolveSmartFillPath}
              smartFillSpace={smartFillSpace}
              currentColor={currentColor}
              brushKind={currentBrushKind}
              solidMode={currentSolidMode}
              patternUri={currentPatternUri}
              enabled
              layerWidth={layer.width}
              layerHeight={layer.height}
              zoomScale={zoomScale}
            />
          </View>
        ) : null}

        {showPlacementUI ? (
          <LayerSelectionChrome resizeGestures={resizeGestures} />
        ) : null}
      </View>
    );

    const renderLayerShell = (pointerEvents: "auto" | "none" = "auto") => (
      <Animated.View
        collapsable={false}
        pointerEvents={pointerEvents}
        style={[styles.assetAnchor, visualFrameStyle]}
      >
        <Animated.View style={[styles.assetTransform, rotatedContentStyle]}>
          {renderLayerContent()}
        </Animated.View>
      </Animated.View>
    );

    if (!shouldCaptureTouches) {
      return renderLayerShell("none");
    }

    return (
      <GestureDetector gesture={layerGesture}>
        {renderLayerShell()}
      </GestureDetector>
    );
  },
  (prevProps, nextProps) =>
    prevProps.layer === nextProps.layer &&
    prevProps.canvasWidth === nextProps.canvasWidth &&
    prevProps.canvasHeight === nextProps.canvasHeight &&
    prevProps.stageScale === nextProps.stageScale &&
    prevProps.displayZIndex === nextProps.displayZIndex &&
    prevProps.isActiveEditable === nextProps.isActiveEditable &&
    prevProps.gesturesEnabled === nextProps.gesturesEnabled &&
    prevProps.enablePinchResize === nextProps.enablePinchResize &&
    prevProps.zoomScale === nextProps.zoomScale &&
    prevProps.isZoomMode === nextProps.isZoomMode &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.onLongPress === nextProps.onLongPress &&
    prevProps.onSelectLayer === nextProps.onSelectLayer &&
    prevProps.currentColor === nextProps.currentColor &&
    prevProps.currentBrushKind === nextProps.currentBrushKind &&
    prevProps.currentPatternUri === nextProps.currentPatternUri &&
    prevProps.currentSolidMode === nextProps.currentSolidMode &&
    prevProps.smartFillSpace === nextProps.smartFillSpace &&
    prevProps.renderReferenceWidth === nextProps.renderReferenceWidth &&
    prevProps.renderReferenceHeight === nextProps.renderReferenceHeight,
);

const styles = StyleSheet.create({
  assetAnchor: {
    position: "absolute",
    overflow: "visible",
  },
  assetTransform: {
    width: "100%",
    height: "100%",
    overflow: "visible",
  },
  frame: {
    flex: 1,
    borderRadius: 18,
    overflow: "visible",
  },
});
