import React from "react";
import { StyleSheet, View } from "react-native";
import {
  GestureDetector,
  type GestureType,
} from "react-native-gesture-handler";
import Animated from "react-native-reanimated";

type ResizeHandleCorner = "topLeft" | "bottomRight";

interface LayerSelectionChromeProps {
  resizeGestures: Record<ResizeHandleCorner, GestureType>;
}

const getHandleStyle = (corner: ResizeHandleCorner) => {
  switch (corner) {
    case "topLeft":
      return styles.handleTopLeft;
    case "bottomRight":
      return styles.handleBottomRight;
  }
};

export const LayerSelectionChrome: React.FC<LayerSelectionChromeProps> =
  React.memo(({ resizeGestures }) => (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="none" style={styles.selectionRing} />
      {(Object.keys(resizeGestures) as ResizeHandleCorner[]).map((corner) => (
        <GestureDetector key={corner} gesture={resizeGestures[corner]}>
          <Animated.View style={[styles.resizeHandle, getHandleStyle(corner)]}>
            <View style={styles.resizeHandleInner} />
          </Animated.View>
        </GestureDetector>
      ))}
    </View>
  ));

const styles = StyleSheet.create({
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
