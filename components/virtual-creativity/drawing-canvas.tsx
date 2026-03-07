import { BrushKind, DrawingPath } from "@/store/virtual-creativity-store";
import React, { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  type SharedValue,
  runOnJS,
  useAnimatedProps,
  useSharedValue,
} from "react-native-reanimated";
import Svg, { Defs, Image as SvgImage, Path, Pattern } from "react-native-svg";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utiles/story-frame";

const DRAW_STROKE_WIDTH = 50;
const PATTERN_TILE_SIZE = 60;

const AnimatedPath = Animated.createAnimatedComponent(Path);

const CompletedPathsSvg = React.memo(
  ({
    paths,
    layerWidth,
    layerHeight,
  }: {
    paths: DrawingPath[];
    layerWidth: number;
    layerHeight: number;
  }) => {
    const patternUris = useMemo(() => {
      const uris: string[] = [];
      const seen = new Set<string>();
      for (const path of paths) {
        if (
          path.brushKind === "pattern" &&
          path.patternUri &&
          !seen.has(path.patternUri)
        ) {
          seen.add(path.patternUri);
          uris.push(path.patternUri);
        }
      }
      return uris;
    }, [paths]);

    if (paths.length === 0) {
      return null;
    }

    return (
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${layerWidth} ${layerHeight}`}
      >
        {patternUris.length > 0 ? (
          <Defs>
            {patternUris.map((uri, index) => (
              <Pattern
                key={`cp${index}`}
                id={`cp${index}`}
                patternUnits="userSpaceOnUse"
                width={PATTERN_TILE_SIZE}
                height={PATTERN_TILE_SIZE}
              >
                <SvgImage
                  href={{ uri }}
                  x={0}
                  y={0}
                  width={PATTERN_TILE_SIZE}
                  height={PATTERN_TILE_SIZE}
                  preserveAspectRatio="xMidYMid slice"
                />
              </Pattern>
            ))}
          </Defs>
        ) : null}

        {paths.map((path) => {
          if (!path.path) {
            return null;
          }

          const isPattern = path.brushKind === "pattern" && path.patternUri;
          const patternIndex = isPattern
            ? patternUris.indexOf(path.patternUri!)
            : -1;

          if (isPattern && patternIndex >= 0) {
            return (
              <React.Fragment key={path.id}>
                <Path
                  d={path.path}
                  stroke={path.color || "#888"}
                  strokeWidth={path.strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.35}
                />
                <Path
                  d={path.path}
                  stroke={`url(#cp${patternIndex})`}
                  strokeWidth={path.strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </React.Fragment>
            );
          }

          return (
            <Path
              key={path.id}
              d={path.path}
              stroke={path.color}
              strokeWidth={path.strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </Svg>
    );
  },
);

interface DrawingCanvasProps {
  paths: DrawingPath[];
  isZoomMode: boolean;
  onAddPath: (path: DrawingPath) => void;
  currentColor: string;
  brushKind?: BrushKind;
  patternUri?: string;
  signatureId?: string;
  enabled?: boolean;
  layerWidth?: number;
  layerHeight?: number;
  zoomScale?: SharedValue<number>;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  paths,
  isZoomMode,
  onAddPath,
  currentColor,
  brushKind,
  patternUri,
  signatureId,
  enabled = true,
  layerWidth = STORY_FRAME_WIDTH,
  layerHeight = STORY_FRAME_HEIGHT,
  zoomScale,
}) => {
  const currentPathData = useSharedValue("");
  const isDrawing = useSharedValue(false);
  const viewWidth = useSharedValue(0);
  const viewHeight = useSharedValue(0);
  const lastX = useSharedValue(0);
  const lastY = useSharedValue(0);

  const activePathProps = useAnimatedProps(() => ({
    d: currentPathData.value || "M 0 0",
    opacity: isDrawing.value ? 1 : 0,
    strokeWidth: DRAW_STROKE_WIDTH / (zoomScale ? zoomScale.value : 1),
  }));

  const commitPath = useCallback(
    (pathData: string) => {
      if (!pathData) {
        return;
      }

      onAddPath({
        id: Date.now().toString(),
        path: pathData,
        color: currentColor,
        strokeWidth: DRAW_STROKE_WIDTH / (zoomScale ? zoomScale.value : 1),
        brushKind,
        patternUri,
        signatureId,
      });

      requestAnimationFrame(() => {
        currentPathData.value = "";
        isDrawing.value = false;
      });
    },
    [brushKind, currentColor, onAddPath, patternUri, signatureId, zoomScale],
  );

  const panGesture = Gesture.Pan()
    .enabled(!isZoomMode && enabled)
    .minDistance(1)
    .onStart((event) => {
      "worklet";
      const sx = viewWidth.value > 0 ? layerWidth / viewWidth.value : 1;
      const sy = viewHeight.value > 0 ? layerHeight / viewHeight.value : 1;
      const x = Math.round(event.x * sx * 10) / 10;
      const y = Math.round(event.y * sy * 10) / 10;

      currentPathData.value = `M ${x} ${y}`;
      lastX.value = x;
      lastY.value = y;
      isDrawing.value = true;
    })
    .onUpdate((event) => {
      "worklet";
      const sx = viewWidth.value > 0 ? layerWidth / viewWidth.value : 1;
      const sy = viewHeight.value > 0 ? layerHeight / viewHeight.value : 1;
      const x = Math.round(event.x * sx * 10) / 10;
      const y = Math.round(event.y * sy * 10) / 10;

      const midX = Math.round(((lastX.value + x) / 2) * 10) / 10;
      const midY = Math.round(((lastY.value + y) / 2) * 10) / 10;
      currentPathData.value += ` Q ${lastX.value} ${lastY.value} ${midX} ${midY}`;
      lastX.value = x;
      lastY.value = y;
    })
    .onEnd(() => {
      "worklet";
      currentPathData.value += ` L ${lastX.value} ${lastY.value}`;
      const finalPath = currentPathData.value;
      if (finalPath) {
        runOnJS(commitPath)(finalPath);
      }
    });

  return (
    <GestureDetector gesture={panGesture}>
      <View
        style={StyleSheet.absoluteFill}
        onLayout={(event) => {
          viewWidth.value = event.nativeEvent.layout.width;
          viewHeight.value = event.nativeEvent.layout.height;
        }}
      >
        <CompletedPathsSvg
          paths={paths}
          layerWidth={layerWidth}
          layerHeight={layerHeight}
        />

        <Svg
          style={StyleSheet.absoluteFill}
          viewBox={`0 0 ${layerWidth} ${layerHeight}`}
        >
          {brushKind === "pattern" && patternUri ? (
            <Defs>
              <Pattern
                id="ap0"
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
            animatedProps={activePathProps}
            stroke={
              brushKind === "pattern" && patternUri ? "url(#ap0)" : currentColor
            }
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </GestureDetector>
  );
};
