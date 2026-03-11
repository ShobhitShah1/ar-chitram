import React from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { runOnJS } from "react-native-worklets";
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
  (translationX + translationY) / 2;

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
    const updateLayer = useVirtualCreativityStore((state) => state.updateLayer);

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

    const clampX = React.useCallback(
      (nextX: number, nextScale: number) =>
        clampLayerAxisPosition({
          canvasSize: canvasWidth,
          layerSize: layer.width,
          maxFitScale,
          nextPosition: nextX,
          nextScale,
        }),
      [canvasWidth, layer.width, maxFitScale],
    );

    const clampY = React.useCallback(
      (nextY: number, nextScale: number) =>
        clampLayerAxisPosition({
          canvasSize: canvasHeight,
          layerSize: layer.height,
          maxFitScale,
          nextPosition: nextY,
          nextScale,
        }),
      [canvasHeight, layer.height, maxFitScale],
    );

    React.useEffect(() => {
      const nextScale = Math.min(layer.scale, maxFitScale);
      const nextX = clampX(layer.x, nextScale);
      const nextY = clampY(layer.y, nextScale);

      translateX.value = withSpring(nextX);
      translateY.value = withSpring(nextY);
      scale.value = withSpring(nextScale);
      rotation.value = withSpring(layer.rotation);
      startX.value = nextX;
      startY.value = nextY;
      startScale.value = nextScale;
      startRotation.value = layer.rotation;
    }, [
      clampX,
      clampY,
      layer.rotation,
      layer.scale,
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

    const queueTransformCommit = React.useCallback(
      (
        nextX: number,
        nextY: number,
        nextScale: number,
        nextRotation: number,
      ) => {
        requestAnimationFrame(() => {
          const fittedScale = Math.min(nextScale, maxFitScale);
          updateLayer(layer.id, {
            x: clampX(nextX, fittedScale),
            y: clampY(nextY, fittedScale),
            scale: fittedScale,
            rotation: nextRotation,
          });
        });
      },
      [clampX, clampY, layer.id, maxFitScale, updateLayer],
    );

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
          .runOnJS(true)
          .maxDistance(12)
          .maxDuration(220)
          .onEnd((_event, success) => {
            if (!success) {
              return;
            }

            if (canTapSelected) {
              queueSelectedTap();
              return;
            }

            if (canTapToSelect) {
              queueSelect();
            }
          }),
      [canTapSelected, canTapToSelect, queueSelect, queueSelectedTap],
    );

    const panGesture = React.useMemo(
      () =>
        Gesture.Pan()
          .enabled(gesturesEnabled && isSelected)
          .minDistance(0)
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

            translateX.value = clampX(nextX, scale.value);
            translateY.value = clampY(nextY, scale.value);
          })
          .onFinalize(() => {
            const nextScale = Math.min(scale.value, maxFitScale);
            const nextX = clampX(translateX.value, nextScale);
            const nextY = clampY(translateY.value, nextScale);
            const nextRotation = rotation.value;

            translateX.value = nextX;
            translateY.value = nextY;
            scale.value = nextScale;
            startX.value = nextX;
            startY.value = nextY;
            runOnJS(queueTransformCommit)(
              nextX,
              nextY,
              nextScale,
              nextRotation,
            );
          }),
      [
        clampX,
        clampY,
        gesturesEnabled,
        isSelected,
        maxFitScale,
        queueTransformCommit,
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
            translateX.value = clampX(translateX.value, nextScale);
            translateY.value = clampY(translateY.value, nextScale);
          })
          .onFinalize(() => {
            const nextScale = Math.min(scale.value, maxFitScale);
            const nextX = clampX(translateX.value, nextScale);
            const nextY = clampY(translateY.value, nextScale);
            const nextRotation = rotation.value;

            scale.value = nextScale;
            translateX.value = nextX;
            translateY.value = nextY;
            startScale.value = nextScale;
            startX.value = nextX;
            startY.value = nextY;
            runOnJS(queueTransformCommit)(
              nextX,
              nextY,
              nextScale,
              nextRotation,
            );
          }),
      [
        clampX,
        clampY,
        enablePinchResize,
        gesturesEnabled,
        isSelected,
        maxFitScale,
        queueTransformCommit,
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
            const nextX = clampX(translateX.value, nextScale);
            const nextY = clampY(translateY.value, nextScale);
            const nextRotation = rotation.value;

            translateX.value = nextX;
            translateY.value = nextY;
            scale.value = nextScale;
            startX.value = nextX;
            startY.value = nextY;
            startRotation.value = nextRotation;
            runOnJS(queueTransformCommit)(
              nextX,
              nextY,
              nextScale,
              nextRotation,
            );
          }),
      [
        clampX,
        clampY,
        gesturesEnabled,
        isSelected,
        maxFitScale,
        queueTransformCommit,
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
            translateX.value = clampX(translateX.value, nextScale);
            translateY.value = clampY(translateY.value, nextScale);
          })
          .onFinalize(() => {
            const nextScale = Math.min(scale.value, maxFitScale);
            const nextX = clampX(translateX.value, nextScale);
            const nextY = clampY(translateY.value, nextScale);
            const nextRotation = rotation.value;

            scale.value = nextScale;
            translateX.value = nextX;
            translateY.value = nextY;
            startScale.value = nextScale;
            startX.value = nextX;
            startY.value = nextY;
            runOnJS(queueTransformCommit)(
              nextX,
              nextY,
              nextScale,
              nextRotation,
            );
          }),
      [
        canvasHeight,
        canvasWidth,
        clampX,
        clampY,
        gesturesEnabled,
        isSelected,
        maxFitScale,
        queueTransformCommit,
        rotation,
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

    const layerGesture = React.useMemo(
      () =>
        Gesture.Simultaneous(
          Gesture.Race(panGesture, tapGesture),
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

    const renderLayerContent = () => (
      <>
        <View style={styles.frame}>
          {layer.uri ? (
            <Image
              source={{ uri: layer.uri }}
              style={styles.image}
              contentFit="contain"
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

    const renderLayerShell = () => (
      <Animated.View style={[styles.assetAnchor, visualFrameStyle]}>
        <Animated.View style={[styles.assetTransform, rotatedContentStyle]}>
          {renderLayerContent()}
        </Animated.View>
      </Animated.View>
    );

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
            {__DEV__ ? (
              <View pointerEvents="none" style={styles.debugDragBounds} />
            ) : null}
            {renderLayerShell()}
          </View>
        </GestureDetector>
      );
    }

    return (
      <GestureDetector gesture={layerGesture}>
        <View style={styles.layer}>{renderLayerShell()}</View>
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
  debugDragBounds: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(239, 68, 68, 0.95)",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
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