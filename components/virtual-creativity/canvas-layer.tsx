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
import { Image } from "expo-image";

import { DrawingCanvas } from "@/components/virtual-creativity/drawing-canvas";
import { DrawingLayerSvg } from "@/components/virtual-creativity/drawing-layer-svg";
import type {
  SmartFillRegion,
  SmartFillSpace,
} from "@/services/smart-fill-path-service";
import {
  clampLayerAxisPosition,
  getLayerDisplayFrame,
  getMaxFitScale,
  getResizeScaleDelta,
  MIN_LAYER_SCALE,
} from "@/services/virtual-layer-transform";
import { getVirtualLayerRenderMetrics } from "@/services/virtual-layer-service";
import {
  type BrushKind,
  type DrawingPath,
  type SolidDrawMode,
  type VirtualLayer,
  useVirtualCreativityStore,
} from "@/store/virtual-creativity-store";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utiles/story-frame";

type CanvasPoint = {
  x: number;
  y: number;
};

type ResizeHandleCorner = "topLeft" | "bottomRight";
const TRANSFORM_COMMIT_EPSILON = 0.001;

interface CanvasLayerProps {
  layer: VirtualLayer;
  canvasWidth?: number;
  canvasHeight?: number;
  stageScale: number;
  isSelected?: boolean;
  isActiveEditable?: boolean;
  onSelect?: () => void;
  onTapSelected?: () => void;
  gesturesEnabled?: boolean;
  enablePinchResize?: boolean;
  hideSelectionUI?: boolean;
  zoomScale?: SharedValue<number>;
  isZoomMode?: boolean;
  currentColor?: string;
  currentBrushKind?: BrushKind;
  currentPatternUri?: string;
  currentSolidMode?: SolidDrawMode;
  smartFillSpace?: SmartFillSpace | null;
  onAddPath?: (path: DrawingPath) => void;
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

const RESIZE_HANDLES: ResizeHandleCorner[] = ["topLeft", "bottomRight"];

const deferCallback = (callback?: () => void) => {
  if (!callback) {
    return;
  }

  requestAnimationFrame(() => {
    callback();
  });
};

const getHandleStyle = (corner: ResizeHandleCorner) => {
  switch (corner) {
    case "topLeft":
      return styles.handleTopLeft;
    case "bottomRight":
      return styles.handleBottomRight;
  }
};

const getDiagonalDelta = (translationX: number, translationY: number) =>
  {
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
      Math.abs(currentLayer.scale - fittedScale) <
        TRANSFORM_COMMIT_EPSILON &&
      Math.abs(currentLayer.rotation - nextRotation) <
        TRANSFORM_COMMIT_EPSILON
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
    isSelected = false,
    isActiveEditable = false,
    onSelect,
    onTapSelected,
    gesturesEnabled = true,
    enablePinchResize = false,
    hideSelectionUI = false,
    zoomScale,
    isZoomMode = false,
    currentColor = "#000000",
    currentBrushKind,
    currentPatternUri,
    currentSolidMode = "free-draw",
    smartFillSpace = null,
    onAddPath,
    onTapFill,
    onEraseSessionStart,
    onEraseSessionEnd,
    onEraseAt,
  resolveSmartFillPath,
    renderReferenceWidth = STORY_FRAME_WIDTH,
    renderReferenceHeight = STORY_FRAME_HEIGHT,
  }) => {
    const layerImageSource = React.useMemo(
      () => (layer.uri ? { uri: layer.uri } : null),
      [layer.uri],
    );
    const translateX = useSharedValue(layer.x);
    const translateY = useSharedValue(layer.y);
    const scale = useSharedValue(layer.scale);
    const rotation = useSharedValue(layer.rotation);

    const startX = useSharedValue(layer.x);
    const startY = useSharedValue(layer.y);
    const startScale = useSharedValue(layer.scale);
    const startRotation = useSharedValue(layer.rotation);

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

      translateX.value = withSpring(nextX);
      translateY.value = withSpring(nextY);
      scale.value = withSpring(nextScale);
      rotation.value = withSpring(layer.rotation);
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

    const queueSelect = React.useCallback(() => {
      deferCallback(onSelect);
    }, [onSelect]);

    const queueSelectedTap = React.useCallback(() => {
      deferCallback(onTapSelected);
    }, [onTapSelected]);

    const canTapToSelect =
      !!onSelect && !isSelected && (!isActiveEditable || gesturesEnabled);
    const canTapSelected = !!onTapSelected && isSelected && gesturesEnabled;

    const tapGesture = React.useMemo(
      () =>
        Gesture.Tap()
          .enabled(canTapToSelect || canTapSelected)
          .maxDistance(18)
          .maxDuration(280)
          .onEnd((_event, success) => {
            "worklet";
            if (!success) {
              return;
            }

            if (canTapSelected) {
              runOnJS(queueSelectedTap)();
              return;
            }

            if (canTapToSelect) {
              runOnJS(queueSelect)();
            }
          }),
      [canTapSelected, canTapToSelect, queueSelect, queueSelectedTap],
    );

    const panGesture = React.useMemo(
      () =>
        Gesture.Pan()
          .enabled(gesturesEnabled && isSelected)
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
        isSelected,
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
          .enabled(gesturesEnabled && isSelected && enablePinchResize)
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
        isSelected,
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
          .enabled(gesturesEnabled && isSelected)
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
        isSelected,
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
          .enabled(gesturesEnabled && isSelected)
          .minDistance(0)
          .blocksExternalGesture(panGesture)
          .blocksExternalGesture(tapGesture)
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
        isSelected,
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
        tapGesture,
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

    const layerGesture = React.useMemo(
      () =>
        Gesture.Race(
          tapGesture,
          panGesture,
          Gesture.Simultaneous(pinchGesture, rotationGesture),
        ),
      [panGesture, pinchGesture, rotationGesture, tapGesture],
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
        zIndex: isSelected ? layer.zIndex + 100 : layer.zIndex,
      };
    });

    const rotatedContentStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${rotation.value}rad` }],
    }));

    const shouldShowDrawingCanvas = isActiveEditable && !gesturesEnabled;
    const showPlacementUI = isSelected && !hideSelectionUI;
    const shouldUseFixedInteractionBounds =
      gesturesEnabled && isSelected && !shouldShowDrawingCanvas;
    const shouldCaptureTouches =
      shouldShowDrawingCanvas ||
      canTapToSelect ||
      canTapSelected ||
      (gesturesEnabled && isSelected);

    const renderLayerContent = () => (
      <>
        <View style={styles.frame}>
          {layerImageSource ? (
            <Image
              source={layerImageSource}
              style={styles.image}
              contentFit="contain"
              transition={0}
            />
          ) : null}

          {!shouldShowDrawingCanvas ? (
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
        </View>

        {showPlacementUI ? (
          <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            <View style={styles.selectionRing} />
            {RESIZE_HANDLES.map((corner) => (
              <GestureDetector key={corner} gesture={resizeGestures[corner]}>
                <Animated.View
                  style={[styles.resizeHandle, getHandleStyle(corner)]}
                >
                  <View style={styles.resizeHandleInner} />
                </Animated.View>
              </GestureDetector>
            ))}
          </View>
        ) : null}
      </>
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

    if (shouldUseFixedInteractionBounds) {
      return (
        <GestureDetector gesture={layerGesture}>
          <View
            collapsable={false}
            pointerEvents="auto"
            style={[
              styles.layer,
              styles.interactionBounds,
              {
                left: 0,
                top: 0,
                width: canvasWidth * stageScale,
                height: canvasHeight * stageScale,
              },
            ]}
          >
            {renderLayerShell()}
          </View>
        </GestureDetector>
      );
    }

    return (
      <GestureDetector gesture={layerGesture}>
        {renderLayerShell()}
      </GestureDetector>
    );
  },
);

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    overflow: "visible",
  },
  interactionBounds: {
    backgroundColor: "transparent",
    overflow: "visible",
  },
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
  image: {
    width: "100%",
    height: "100%",
  },
  selectionRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(17, 17, 17, 0.92)",
  },
  resizeHandle: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#111111",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  resizeHandleInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  handleTopLeft: {
    left: -11,
    top: -11,
  },
  handleBottomRight: {
    right: -11,
    bottom: -11,
  },
});
