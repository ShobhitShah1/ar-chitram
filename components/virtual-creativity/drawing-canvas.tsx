import { DrawingPath } from "@/store/virtual-creativity-store";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utiles/story-frame";

const DRAW_STROKE_WIDTH = 18;

interface DrawingCanvasProps {
  layerId: string;
  paths: DrawingPath[];
  isZoomMode: boolean;
  onAddPath: (path: DrawingPath) => void;
  currentColor: string;
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
  enabled = true,
  layerWidth = STORY_FRAME_WIDTH,
  layerHeight = STORY_FRAME_HEIGHT,
}) => {
  const [currentPath, setCurrentPath] = useState<string>("");
  const currentPathBuilder = useSharedValue("");
  const viewWidth = useSharedValue(0);
  const viewHeight = useSharedValue(0);

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
    })
    .onUpdate((e) => {
      const scaleX = viewWidth.value > 0 ? layerWidth / viewWidth.value : 1;
      const scaleY = viewHeight.value > 0 ? layerHeight / viewHeight.value : 1;

      const x = e.x * scaleX;
      const y = e.y * scaleY;

      const newSegment = ` L ${x} ${y}`;
      currentPathBuilder.value += newSegment;
      scheduleOnRN(setCurrentPath, currentPathBuilder.value);
    })
    .onEnd(() => {
      const finalPath = currentPathBuilder.value;
      if (finalPath) {
        scheduleOnRN(onAddPath, {
          id: Date.now().toString(),
          path: finalPath,
          color: currentColor,
          strokeWidth: DRAW_STROKE_WIDTH,
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
          {paths.map((p) => (
            <Path
              key={p.id}
              d={p.path}
              stroke={p.color}
              strokeWidth={p.strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
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
