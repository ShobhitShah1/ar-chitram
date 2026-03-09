import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  type SharedValue,
  runOnJS,
  useAnimatedProps,
  useSharedValue,
} from "react-native-reanimated";
import Svg, {
  ClipPath,
  Defs,
  Image as SvgImage,
  Path,
  Pattern,
} from "react-native-svg";

import { DrawingLayerSvg } from "@/components/virtual-creativity/drawing-layer-svg";
import { sanitizeSvgPathData } from "@/services/svg-path-utils";
import {
  getSmartFillDisplayLayout,
  mapLayerPointToSmartFillSpace,
} from "@/services/smart-fill-layout";
import type {
  SmartFillRegion,
  SmartFillSpace,
} from "@/services/smart-fill-path-service";
import {
  BrushKind,
  DrawingPath,
  SolidDrawMode,
} from "@/store/virtual-creativity-store";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utiles/story-frame";

const DRAW_STROKE_WIDTH = 50;
const PATTERN_TILE_SIZE = 60;
const ACTIVE_LAYER_CLIP_ID = "active-layer-region-clip";
const ACTIVE_IMAGE_CLIP_ID = "active-image-region-clip";
const FREEHAND_TOKEN_REGEX = /[MLQ]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g;

type CanvasPoint = {
  x: number;
  y: number;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface DrawingCanvasProps {
  paths: DrawingPath[];
  isZoomMode: boolean;
  onAddPath: (path: DrawingPath) => void;
  onSmartFill?: (point: CanvasPoint) => void | Promise<void>;
  onEraseSessionStart?: () => void;
  onEraseSessionEnd?: () => void;
  onEraseAt?: (point: CanvasPoint, radius: number) => void;
  resolveSmartFillPath?: (
    point: CanvasPoint,
  ) => Promise<SmartFillRegion | null>;
  smartFillSpace?: SmartFillSpace | null;
  currentColor: string;
  brushKind?: BrushKind;
  solidMode?: SolidDrawMode;
  patternUri?: string;
  signatureId?: string;
  enabled?: boolean;
  layerWidth?: number;
  layerHeight?: number;
  zoomScale?: SharedValue<number>;
}

const formatCoordinate = (value: number) => `${Math.round(value * 10) / 10}`;

const isPathCommand = (token?: string) =>
  token === "M" || token === "L" || token === "Q";

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  paths,
  isZoomMode,
  onAddPath,
  onSmartFill,
  onEraseSessionStart,
  onEraseSessionEnd,
  onEraseAt,
  resolveSmartFillPath,
  smartFillSpace,
  currentColor,
  brushKind,
  solidMode = "free-draw",
  patternUri,
  signatureId,
  enabled = true,
  layerWidth = STORY_FRAME_WIDTH,
  layerHeight = STORY_FRAME_HEIGHT,
  zoomScale,
}) => {
  const [activeRegion, setActiveRegion] = useState<SmartFillRegion | null>(
    null,
  );

  const currentLayerPathData = useSharedValue("");
  const currentImagePathData = useSharedValue("");
  const isDrawing = useSharedValue(false);
  const viewWidth = useSharedValue(0);
  const viewHeight = useSharedValue(0);
  const lastLayerX = useSharedValue(0);
  const lastLayerY = useSharedValue(0);
  const lastImageX = useSharedValue(0);
  const lastImageY = useSharedValue(0);

  const activeRegionRef = useRef<SmartFillRegion | null>(null);
  const activeRegionRequestIdRef = useRef(0);
  const activeRegionPromiseRef = useRef<Promise<SmartFillRegion | null> | null>(
    null,
  );
  const strokeActiveRef = useRef(false);
  const strokeStartPointRef = useRef<CanvasPoint | null>(null);
  const lastErasePointRef = useRef<CanvasPoint | null>(null);

  const activeBrushKind = brushKind ?? "solid";
  const supportsPatternBrush =
    activeBrushKind === "pattern" && !!patternUri;
  const supportsSmartFillBrush =
    activeBrushKind === "solid" || supportsPatternBrush;
  const isTapFillMode = supportsSmartFillBrush && solidMode === "tap-fill";
  const isObjectDrawMode =
    supportsSmartFillBrush && solidMode === "object-draw";
  const isEraseMode = solidMode === "erase";

  const setActiveRegionState = useCallback(
    (nextRegion: SmartFillRegion | null) => {
      activeRegionRef.current = nextRegion;
      setActiveRegion(nextRegion);
    },
    [],
  );

  const clearActiveRegion = useCallback(() => {
    activeRegionRequestIdRef.current += 1;
    activeRegionPromiseRef.current = null;
    strokeStartPointRef.current = null;
    strokeActiveRef.current = false;
    setActiveRegionState(null);
  }, [setActiveRegionState]);

  const resetPreview = useCallback(() => {
    currentLayerPathData.value = "";
    currentImagePathData.value = "";
    isDrawing.value = false;
    clearActiveRegion();
  }, [
    clearActiveRegion,
    currentImagePathData,
    currentLayerPathData,
    isDrawing,
  ]);

  const requestActiveRegion = useCallback(
    (point: CanvasPoint) => {
      strokeStartPointRef.current = point;

      if (!resolveSmartFillPath) {
        activeRegionPromiseRef.current = Promise.resolve(null);
        setActiveRegionState(null);
        return activeRegionPromiseRef.current;
      }

      const requestId = ++activeRegionRequestIdRef.current;
      strokeActiveRef.current = true;

      const pendingPromise = resolveSmartFillPath(point)
        .then((region) => {
          if (
            strokeActiveRef.current &&
            requestId === activeRegionRequestIdRef.current
          ) {
            setActiveRegionState(region);
          }
          return region;
        })
        .catch(() => {
          if (requestId === activeRegionRequestIdRef.current) {
            setActiveRegionState(null);
          }
          return null;
        });

      activeRegionPromiseRef.current = pendingPromise;
      return pendingPromise;
    },
    [resolveSmartFillPath, setActiveRegionState],
  );

  const resolveRegionForCommit = useCallback(async () => {
    if (!isObjectDrawMode) {
      return null;
    }

    if (activeRegionRef.current?.path) {
      return activeRegionRef.current;
    }

    if (activeRegionPromiseRef.current) {
      return activeRegionPromiseRef.current;
    }

    if (strokeStartPointRef.current) {
      return requestActiveRegion(strokeStartPointRef.current);
    }

    return null;
  }, [isObjectDrawMode, requestActiveRegion]);

  const getBaseStrokeWidth = useCallback(
    () => DRAW_STROKE_WIDTH / (zoomScale ? zoomScale.value : 1),
    [zoomScale],
  );

  const getObjectStrokeWidth = useCallback(
    (spaceWidth: number, spaceHeight: number) => {
      const layout = getSmartFillDisplayLayout(
        spaceWidth,
        spaceHeight,
        layerWidth,
        layerHeight,
      );

      return getBaseStrokeWidth() / Math.max(layout.scale, 0.0001);
    },
    [getBaseStrokeWidth, layerHeight, layerWidth],
  );

  const transformFreehandPathToImageSpace = useCallback(
    (pathData: string, spaceWidth: number, spaceHeight: number) => {
      const tokens = pathData.match(FREEHAND_TOKEN_REGEX) ?? [];
      if (tokens.length === 0) {
        return null;
      }

      const output: string[] = [];
      let index = 0;

      while (index < tokens.length) {
        const command = tokens[index];
        index += 1;

        if (!isPathCommand(command)) {
          return null;
        }

        output.push(command);
        const pairCount = command === "Q" ? 2 : 1;

        while (index < tokens.length && !isPathCommand(tokens[index])) {
          for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
            const x = Number.parseFloat(tokens[index] ?? "");
            const y = Number.parseFloat(tokens[index + 1] ?? "");
            index += 2;

            if (!Number.isFinite(x) || !Number.isFinite(y)) {
              return null;
            }

            const mappedPoint = mapLayerPointToSmartFillSpace(
              x,
              y,
              spaceWidth,
              spaceHeight,
              layerWidth,
              layerHeight,
              true,
            );

            if (!mappedPoint) {
              return null;
            }

            output.push(
              formatCoordinate(mappedPoint.x),
              formatCoordinate(mappedPoint.y),
            );
          }
        }
      }

      return output.join(" ");
    },
    [layerHeight, layerWidth],
  );

  const commitPath = useCallback(
    async (pathData: string, pathIsImageSpace = false) => {
      const sanitizedBasePath = sanitizeSvgPathData(pathData);
      if (!sanitizedBasePath) {
        resetPreview();
        return;
      }

      try {
        const nextPath: DrawingPath = {
          id: Date.now().toString(),
          path: sanitizedBasePath,
          color: currentColor,
          strokeWidth: getBaseStrokeWidth(),
          brushKind,
          patternUri,
          signatureId,
        };

        if (isObjectDrawMode) {
          const region = await resolveRegionForCommit();
          if (region?.path) {
            const safeRegionPath = sanitizeSvgPathData(region.path);
            if (!safeRegionPath) {
              resetPreview();
              return;
            }

            const imageSpacePath = pathIsImageSpace
              ? sanitizedBasePath
              : transformFreehandPathToImageSpace(
                  sanitizedBasePath,
                  region.width,
                  region.height,
                );

            const sanitizedImageSpacePath = imageSpacePath
              ? sanitizeSvgPathData(imageSpacePath)
              : null;

            if (sanitizedImageSpacePath) {
              nextPath.path = sanitizedImageSpacePath;
              nextPath.strokeWidth = getObjectStrokeWidth(
                region.width,
                region.height,
              );
              nextPath.clipPath = safeRegionPath;
              nextPath.pathSpace = "image";
              nextPath.pathSpaceWidth = region.width;
              nextPath.pathSpaceHeight = region.height;
            } else {
              nextPath.clipPath = safeRegionPath;
              nextPath.regionTransform = region.regionTransform;
            }
          }
        }

        onAddPath(nextPath);
      } catch {
        // Swallow transient native/parser errors and keep UI responsive.
      }

      requestAnimationFrame(resetPreview);
    },
    [
      brushKind,
      currentColor,
      getBaseStrokeWidth,
      getObjectStrokeWidth,
      isObjectDrawMode,
      onAddPath,
      patternUri,
      resetPreview,
      resolveRegionForCommit,
      signatureId,
      transformFreehandPathToImageSpace,
    ],
  );

  const handleTapFill = useCallback(
    async (point: CanvasPoint) => {
      if (!onSmartFill) {
        return;
      }

      await onSmartFill(point);
    },
    [onSmartFill],
  );

  const getEraseRadius = useCallback(() => {
    const scale = zoomScale ? zoomScale.value : 1;
    return (DRAW_STROKE_WIDTH * 0.55) / scale;
  }, [zoomScale]);

  const beginErase = useCallback(
    (point: CanvasPoint) => {
      lastErasePointRef.current = point;
      onEraseSessionStart?.();
      onEraseAt?.(point, getEraseRadius());
    },
    [getEraseRadius, onEraseAt, onEraseSessionStart],
  );

  const continueErase = useCallback(
    (point: CanvasPoint) => {
      const previousPoint = lastErasePointRef.current;
      const radius = getEraseRadius();
      if (previousPoint) {
        const dx = point.x - previousPoint.x;
        const dy = point.y - previousPoint.y;
        if (dx * dx + dy * dy < radius * 0.35 * (radius * 0.35)) {
          return;
        }
      }

      lastErasePointRef.current = point;
      onEraseAt?.(point, radius);
    },
    [getEraseRadius, onEraseAt],
  );

  const endErase = useCallback(() => {
    lastErasePointRef.current = null;
    onEraseSessionEnd?.();
  }, [onEraseSessionEnd]);

  useEffect(() => {
    clearActiveRegion();
    currentLayerPathData.value = "";
    currentImagePathData.value = "";
    isDrawing.value = false;
    lastErasePointRef.current = null;
  }, [
    brushKind,
    clearActiveRegion,
    currentImagePathData,
    currentLayerPathData,
    enabled,
    isDrawing,
    isZoomMode,
    patternUri,
    solidMode,
  ]);

  const activeLayerPathProps = useAnimatedProps(() => ({
    d: currentLayerPathData.value || "M 0 0",
    opacity: isDrawing.value ? 1 : 0,
  }));

  const activeImagePathProps = useAnimatedProps(() => ({
    d: currentImagePathData.value || "M 0 0",
    opacity: isDrawing.value ? 1 : 0,
  }));

  const liveFreehandStrokeWidth = getBaseStrokeWidth();
  const liveObjectStrokeWidth = activeRegion
    ? getObjectStrokeWidth(activeRegion.width, activeRegion.height)
    : smartFillSpace
      ? getObjectStrokeWidth(smartFillSpace.width, smartFillSpace.height)
      : liveFreehandStrokeWidth;

  const drawPanGesture = Gesture.Pan()
    .enabled(!isZoomMode && enabled && !isTapFillMode && !isEraseMode)
    .minDistance(1)
    .onStart((event) => {
      "worklet";
      const sx = viewWidth.value > 0 ? layerWidth / viewWidth.value : 1;
      const sy = viewHeight.value > 0 ? layerHeight / viewHeight.value : 1;
      const x = Math.round(event.x * sx * 10) / 10;
      const y = Math.round(event.y * sy * 10) / 10;

      if (isObjectDrawMode && smartFillSpace) {
        const scale = Math.min(
          layerWidth / smartFillSpace.width,
          layerHeight / smartFillSpace.height,
        );
        const renderedWidth = smartFillSpace.width * scale;
        const renderedHeight = smartFillSpace.height * scale;
        const offsetX = (layerWidth - renderedWidth) / 2;
        const offsetY = (layerHeight - renderedHeight) / 2;
        const localX = Math.max(0, Math.min(renderedWidth, x - offsetX));
        const localY = Math.max(0, Math.min(renderedHeight, y - offsetY));
        const imageX =
          Math.round(
            (localX / Math.max(1, renderedWidth)) * smartFillSpace.width * 10,
          ) / 10;
        const imageY =
          Math.round(
            (localY / Math.max(1, renderedHeight)) * smartFillSpace.height * 10,
          ) / 10;

        currentImagePathData.value = `M ${imageX} ${imageY}`;
        currentLayerPathData.value = "";
        lastImageX.value = imageX;
        lastImageY.value = imageY;
      } else {
        currentLayerPathData.value = `M ${x} ${y}`;
        currentImagePathData.value = "";
        lastLayerX.value = x;
        lastLayerY.value = y;
      }

      isDrawing.value = true;

      if (isObjectDrawMode) {
        runOnJS(requestActiveRegion)({ x, y });
      } else {
        runOnJS(clearActiveRegion)();
      }
    })
    .onUpdate((event) => {
      "worklet";
      const sx = viewWidth.value > 0 ? layerWidth / viewWidth.value : 1;
      const sy = viewHeight.value > 0 ? layerHeight / viewHeight.value : 1;
      const x = Math.round(event.x * sx * 10) / 10;
      const y = Math.round(event.y * sy * 10) / 10;

      if (isObjectDrawMode && smartFillSpace) {
        const scale = Math.min(
          layerWidth / smartFillSpace.width,
          layerHeight / smartFillSpace.height,
        );
        const renderedWidth = smartFillSpace.width * scale;
        const renderedHeight = smartFillSpace.height * scale;
        const offsetX = (layerWidth - renderedWidth) / 2;
        const offsetY = (layerHeight - renderedHeight) / 2;
        const localX = Math.max(0, Math.min(renderedWidth, x - offsetX));
        const localY = Math.max(0, Math.min(renderedHeight, y - offsetY));
        const imageX =
          Math.round(
            (localX / Math.max(1, renderedWidth)) * smartFillSpace.width * 10,
          ) / 10;
        const imageY =
          Math.round(
            (localY / Math.max(1, renderedHeight)) * smartFillSpace.height * 10,
          ) / 10;
        const midX = Math.round(((lastImageX.value + imageX) / 2) * 10) / 10;
        const midY = Math.round(((lastImageY.value + imageY) / 2) * 10) / 10;

        if (!currentImagePathData.value) {
          currentImagePathData.value = `M ${lastImageX.value} ${lastImageY.value}`;
        }
        currentImagePathData.value += ` Q ${lastImageX.value} ${lastImageY.value} ${midX} ${midY}`;
        lastImageX.value = imageX;
        lastImageY.value = imageY;
        return;
      }

      const midX = Math.round(((lastLayerX.value + x) / 2) * 10) / 10;
      const midY = Math.round(((lastLayerY.value + y) / 2) * 10) / 10;
      if (!currentLayerPathData.value) {
        currentLayerPathData.value = `M ${lastLayerX.value} ${lastLayerY.value}`;
      }
      currentLayerPathData.value += ` Q ${lastLayerX.value} ${lastLayerY.value} ${midX} ${midY}`;
      lastLayerX.value = x;
      lastLayerY.value = y;
    })
    .onEnd(() => {
      "worklet";
      if (isObjectDrawMode && smartFillSpace) {
        if (!currentImagePathData.value) {
          runOnJS(resetPreview)();
          return;
        }

        currentImagePathData.value += ` L ${lastImageX.value} ${lastImageY.value}`;
        const finalImagePath = currentImagePathData.value;
        runOnJS(commitPath)(finalImagePath, true);
        return;
      }

      if (!currentLayerPathData.value) {
        runOnJS(resetPreview)();
        return;
      }

      currentLayerPathData.value += ` L ${lastLayerX.value} ${lastLayerY.value}`;
      const finalPath = currentLayerPathData.value;
      runOnJS(commitPath)(finalPath);
    })
    .onFinalize(() => {
      "worklet";
      if (!currentLayerPathData.value && !currentImagePathData.value) {
        isDrawing.value = false;
      }
    });

  const tapFillGesture = Gesture.Tap()
    .enabled(!isZoomMode && enabled && isTapFillMode)
    .maxDistance(16)
    .onEnd((event, success) => {
      "worklet";
      if (!success) {
        return;
      }

      const sx = viewWidth.value > 0 ? layerWidth / viewWidth.value : 1;
      const sy = viewHeight.value > 0 ? layerHeight / viewHeight.value : 1;
      const x = Math.round(event.x * sx * 10) / 10;
      const y = Math.round(event.y * sy * 10) / 10;
      runOnJS(handleTapFill)({ x, y });
    });

  const erasePanGesture = Gesture.Pan()
    .enabled(!isZoomMode && enabled && isEraseMode)
    .minDistance(1)
    .onStart((event) => {
      "worklet";
      const sx = viewWidth.value > 0 ? layerWidth / viewWidth.value : 1;
      const sy = viewHeight.value > 0 ? layerHeight / viewHeight.value : 1;
      const x = Math.round(event.x * sx * 10) / 10;
      const y = Math.round(event.y * sy * 10) / 10;
      runOnJS(beginErase)({ x, y });
    })
    .onUpdate((event) => {
      "worklet";
      const sx = viewWidth.value > 0 ? layerWidth / viewWidth.value : 1;
      const sy = viewHeight.value > 0 ? layerHeight / viewHeight.value : 1;
      const x = Math.round(event.x * sx * 10) / 10;
      const y = Math.round(event.y * sy * 10) / 10;
      runOnJS(continueErase)({ x, y });
    })
    .onEnd(() => {
      "worklet";
      runOnJS(endErase)();
    })
    .onFinalize(() => {
      "worklet";
      runOnJS(endErase)();
    });

  const eraseTapGesture = Gesture.Tap()
    .enabled(!isZoomMode && enabled && isEraseMode)
    .maxDistance(18)
    .onEnd((event, success) => {
      "worklet";
      if (!success) {
        return;
      }

      const sx = viewWidth.value > 0 ? layerWidth / viewWidth.value : 1;
      const sy = viewHeight.value > 0 ? layerHeight / viewHeight.value : 1;
      const x = Math.round(event.x * sx * 10) / 10;
      const y = Math.round(event.y * sy * 10) / 10;
      runOnJS(beginErase)({ x, y });
      runOnJS(endErase)();
    });

  const activeGesture = isEraseMode
    ? Gesture.Race(eraseTapGesture, erasePanGesture)
    : isTapFillMode
      ? tapFillGesture
      : drawPanGesture;

  const showPatternPreview = supportsPatternBrush;
  const showLayerPreview = !isEraseMode && !isObjectDrawMode;
  const showObjectPreview =
    !isEraseMode &&
    isObjectDrawMode &&
    !!activeRegion?.path &&
    !!smartFillSpace;

  return (
    <GestureDetector gesture={activeGesture}>
      <View
        style={StyleSheet.absoluteFill}
        onLayout={(event) => {
          viewWidth.value = event.nativeEvent.layout.width;
          viewHeight.value = event.nativeEvent.layout.height;
        }}
      >
        <DrawingLayerSvg
          idPrefix="canvas"
          paths={paths}
          layerWidth={layerWidth}
          layerHeight={layerHeight}
        />

        {showLayerPreview ? (
          <Svg
            style={StyleSheet.absoluteFill}
            viewBox={`0 0 ${layerWidth} ${layerHeight}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {showPatternPreview ? (
              <Defs>
                <Pattern
                  id="active-pattern"
                  patternUnits="userSpaceOnUse"
                  width={PATTERN_TILE_SIZE}
                  height={PATTERN_TILE_SIZE}
                >
                  <SvgImage
                    href={{ uri: patternUri }}
                    x={0}
                    y={0}
                    width={PATTERN_TILE_SIZE}
                    height={PATTERN_TILE_SIZE}
                    preserveAspectRatio="xMidYMid slice"
                  />
                </Pattern>
              </Defs>
            ) : null}
            <AnimatedPath
              animatedProps={activeLayerPathProps}
              stroke={
                showPatternPreview ? "url(#active-pattern)" : currentColor
              }
              strokeWidth={liveFreehandStrokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        ) : null}

        {showObjectPreview ? (
          <Svg
            style={StyleSheet.absoluteFill}
            viewBox={`0 0 ${activeRegion.width} ${activeRegion.height}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <Defs>
              <ClipPath id={ACTIVE_IMAGE_CLIP_ID}>
                <Path d={activeRegion.path} />
              </ClipPath>
              {showPatternPreview ? (
                <Pattern
                  id="active-object-pattern"
                  patternUnits="userSpaceOnUse"
                  width={PATTERN_TILE_SIZE}
                  height={PATTERN_TILE_SIZE}
                >
                  <SvgImage
                    href={{ uri: patternUri }}
                    x={0}
                    y={0}
                    width={PATTERN_TILE_SIZE}
                    height={PATTERN_TILE_SIZE}
                    preserveAspectRatio="xMidYMid slice"
                  />
                </Pattern>
              ) : null}
            </Defs>
            <Path d={activeRegion.path} fill={currentColor} opacity={0.08} />
            <AnimatedPath
              animatedProps={activeImagePathProps}
              stroke={
                showPatternPreview ? "url(#active-object-pattern)" : currentColor
              }
              strokeWidth={liveObjectStrokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              clipPath={`url(#${ACTIVE_IMAGE_CLIP_ID})`}
            />
          </Svg>
        ) : null}
      </View>
    </GestureDetector>
  );
};
