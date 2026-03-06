import { BrushKind, DrawingPath } from "@/store/virtual-creativity-store";
import React, { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";
import Svg, { Path, Image as SvgImage } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utiles/story-frame";

const DRAW_STROKE_WIDTH = 30;
const PATTERN_STAMP_DISTANCE = 28;

interface DrawingCanvasProps {
  layerId: string;
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
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  layerId,
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
}) => {
  const [currentPath, setCurrentPath] = useState<string>("");
  const currentPathBuilder = useSharedValue("");
  const viewWidth = useSharedValue(0);
  const viewHeight = useSharedValue(0);
  const patternStampsRef = useRef<{ x: number; y: number }[]>([]);
  const lastStampRef = useRef<{ x: number; y: number } | null>(null);

  const panGesture = Gesture.Pan()
    .enabled(!isZoomMode && enabled)
    .minDistance(1)
    .onStart((e) => {
      // Calculate scaling factors
      const scaleX = viewWidth.value > 0 ? layerWidth / viewWidth.value : 1;
      const scaleY = viewHeight.value > 0 ? layerHeight / viewHeight.value : 1;

      const x = e.x * scaleX;
      const y = e.y * scaleY;

      currentPathBuilder.value = `M ${x} ${y}`;
      scheduleOnRN(setCurrentPath, `M ${x} ${y}`);

      if (brushKind === "pattern" && patternUri) {
        const firstPoint = { x, y };
        patternStampsRef.current = [firstPoint];
        lastStampRef.current = firstPoint;
      } else {
        patternStampsRef.current = [];
        lastStampRef.current = null;
      }
    })
    .onUpdate((e) => {
      const scaleX = viewWidth.value > 0 ? layerWidth / viewWidth.value : 1;
      const scaleY = viewHeight.value > 0 ? layerHeight / viewHeight.value : 1;

      const x = e.x * scaleX;
      const y = e.y * scaleY;

      const newSegment = ` L ${x} ${y}`;
      currentPathBuilder.value += newSegment;
      scheduleOnRN(setCurrentPath, currentPathBuilder.value);

      if (brushKind === "pattern" && patternUri) {
        const last = lastStampRef.current;
        if (!last) {
          const pt = { x, y };
          patternStampsRef.current.push(pt);
          lastStampRef.current = pt;
        } else {
          const dx = x - last.x;
          const dy = y - last.y;
          const distSq = dx * dx + dy * dy;
          if (distSq >= PATTERN_STAMP_DISTANCE * PATTERN_STAMP_DISTANCE) {
            const pt = { x, y };
            patternStampsRef.current.push(pt);
            lastStampRef.current = pt;
          }
        }
      }
    })
    .onEnd(() => {
      const finalPath = currentPathBuilder.value;
      if (finalPath) {
        const stamps =
          brushKind === "pattern" && patternUri
            ? [...patternStampsRef.current]
            : undefined;

        scheduleOnRN(onAddPath, {
          id: Date.now().toString(),
          path: finalPath,
          color: currentColor,
          strokeWidth: DRAW_STROKE_WIDTH,
          brushKind,
          patternUri,
          patternStamps: stamps,
          signatureId,
        });
        scheduleOnRN(setCurrentPath, "");
      }
    });

  return (
    <GestureDetector gesture={panGesture}>
      <View
        style={StyleSheet.absoluteFill}
        onLayout={(e) => {
          viewWidth.value = e.nativeEvent.layout.width;
          viewHeight.value = e.nativeEvent.layout.height;
        }}
      >
        <Svg
          style={StyleSheet.absoluteFill}
          viewBox={`0 0 ${layerWidth} ${layerHeight}`}
        >
          {paths.map((p) =>
            p.brushKind === "pattern" && p.patternUri && p.patternStamps?.length
              ? null
              : (
                  <Path
                    key={p.id}
                    d={p.path}
                    stroke={p.color}
                    strokeWidth={p.strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ),
          )}

          {paths
            .filter(
              (p) =>
                p.brushKind === "pattern" &&
                p.patternUri &&
                p.patternStamps?.length,
            )
            .flatMap((p) => {
              const size = p.strokeWidth * 1.8;
              return p.patternStamps!.map((pt, index) => (
                <SvgImage
                  key={`${p.id}-${index}`}
                  href={{ uri: p.patternUri as string }}
                  x={pt.x - size / 2}
                  y={pt.y - size / 2}
                  width={size}
                  height={size}
                  preserveAspectRatio="xMidYMid slice"
                />
              ));
            })}
          {/* Current drawing path */}
          {currentPath ? (
            <Path
              d={currentPath}
              stroke={currentColor}
              strokeWidth={DRAW_STROKE_WIDTH}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
      </View>
    </GestureDetector>
  );
};
