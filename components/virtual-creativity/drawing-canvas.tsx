import { DrawingPath } from "@/store/virtual-creativity-store";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";

interface DrawingCanvasProps {
  layerId: string;
  paths: DrawingPath[];
  isZoomMode: boolean;
  onAddPath: (path: DrawingPath) => void;
  currentColor: string;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  layerId,
  paths,
  isZoomMode,
  onAddPath,
  currentColor,
}) => {
  const [currentPath, setCurrentPath] = useState<string>("");
  const currentPathBuilder = useSharedValue("");

  const panGesture = Gesture.Pan()
    .enabled(!isZoomMode) // Enable only when NOT in zoom mode
    .minDistance(1)
    .onStart((e) => {
      currentPathBuilder.value = `M ${e.x} ${e.y}`;
      scheduleOnRN(setCurrentPath, `M ${e.x} ${e.y}`);
    })
    .onUpdate((e) => {
      const newSegment = ` L ${e.x} ${e.y}`;
      currentPathBuilder.value += newSegment;
      // throttle updates to JS thread for smoother drawing?
      // For now, direct update for immediate feedback, though slightly perf heavy.
      // A better way is to move the currentPath render to a Reanimated component.
      scheduleOnRN(setCurrentPath, currentPathBuilder.value);
    })
    .onEnd(() => {
      const finalPath = currentPathBuilder.value;
      if (finalPath) {
        scheduleOnRN(onAddPath, {
          id: Date.now().toString(),
          path: finalPath,
          color: currentColor,
          strokeWidth: 5,
        });
        scheduleOnRN(setCurrentPath, "");
      }
    });

  return (
    <GestureDetector gesture={panGesture}>
      <View style={StyleSheet.absoluteFill}>
        <Svg style={StyleSheet.absoluteFill}>
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
              strokeWidth={5}
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
