import React from "react";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Image } from "expo-image";
import {
  VirtualLayer,
  useVirtualCreativityStore,
} from "@/store/virtual-creativity-store";

interface CanvasLayerProps {
  layer: VirtualLayer;
  isSelected?: boolean;
  onSelect?: () => void;
  gesturesEnabled?: boolean;
  zoomScale?: SharedValue<number>;
}

export const CanvasLayer = React.memo<CanvasLayerProps>(
  ({ layer, isSelected, onSelect, gesturesEnabled = true, zoomScale }) => {
    const updateLayer = useVirtualCreativityStore((state) => state.updateLayer);

    const translateX = useSharedValue(layer.x);
    const translateY = useSharedValue(layer.y);
    const scale = useSharedValue(layer.scale);
    const rotation = useSharedValue(layer.rotation);

    const startX = useSharedValue(0);
    const startY = useSharedValue(0);
    const startScale = useSharedValue(1);
    const startRotation = useSharedValue(0);

    // Sync with prop updates (e.g. undo/redo)
    // This is simplified; in production, useDerivedValue or useEffect to sync if external updates happen.
    // For now, assume gestures drive updates primarily.
    // Ideally: useAnimatedReaction or useEffect.
    React.useEffect(() => {
      translateX.value = withSpring(layer.x);
      translateY.value = withSpring(layer.y);
      scale.value = withSpring(layer.scale);
      rotation.value = withSpring(layer.rotation);
    }, [layer.x, layer.y, layer.scale, layer.rotation]); // Sync on prop change

    const panGesture = Gesture.Pan()
      .enabled(gesturesEnabled)
      .onStart(() => {
        startX.value = translateX.value;
        startY.value = translateY.value;
        if (onSelect) {
          scheduleOnRN(onSelect);
        }
      })
      .onUpdate((e) => {
        const currentZoom = zoomScale ? zoomScale.value : 1;
        translateX.value = startX.value + e.translationX / currentZoom;
        translateY.value = startY.value + e.translationY / currentZoom;
      })
      .onEnd(() => {
        scheduleOnRN(updateLayer, layer.id, {
          x: translateX.value,
          y: translateY.value,
        });
      });

    const pinchGesture = Gesture.Pinch()
      .enabled(gesturesEnabled)
      .onStart(() => {
        startScale.value = scale.value;
        if (onSelect) {
          scheduleOnRN(onSelect);
        }
      })
      .onUpdate((e) => {
        scale.value = startScale.value * e.scale;
      })
      .onEnd(() => {
        scheduleOnRN(updateLayer, layer.id, { scale: scale.value });
      });

    const rotationGesture = Gesture.Rotation()
      .enabled(gesturesEnabled)
      .onStart(() => {
        startRotation.value = rotation.value;
        if (onSelect) {
          scheduleOnRN(onSelect);
        }
      })
      .onUpdate((e) => {
        rotation.value = startRotation.value + e.rotation;
      })
      .onEnd(() => {
        scheduleOnRN(updateLayer, layer.id, { rotation: rotation.value });
      });

    const composed = Gesture.Simultaneous(
      panGesture,
      pinchGesture,
      rotationGesture,
    );

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value },
          { scale: scale.value },
          { rotate: `${rotation.value}rad` },
        ],
        zIndex: layer.zIndex,
        borderColor: isSelected ? "#007AFF" : "transparent",
        borderWidth: isSelected ? 2 : 0,
      };
    });

    return (
      <GestureDetector gesture={composed}>
        <Animated.View
          style={[
            styles.layer,
            { width: layer.width, height: layer.height },
            animatedStyle,
          ]}
        >
          <Image
            source={{ uri: layer.uri }}
            style={{ width: "100%", height: "100%" }}
            contentFit="contain"
            key={layer.id}
            tintColor={layer.color}
          />
        </Animated.View>
      </GestureDetector>
    );
  },
);

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
  },
});
