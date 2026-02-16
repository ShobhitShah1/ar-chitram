import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Dimensions, StyleSheet, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  SharedValue,
} from "react-native-reanimated";
import { useTheme } from "@/context/theme-context";
import { Pressable } from "../themed";

const { width } = Dimensions.get("window");
export const MARGIN = 16;
export const COLUMNS = 3;
export const SPACING = 8;
export const TILE_SIZE =
  (width - MARGIN * 2 - SPACING * (COLUMNS - 1)) / COLUMNS;
export const TILE_ASPECT = 1.35; // Slightly taller for portrait feeling
export const TILE_WIDTH = TILE_SIZE + SPACING;
export const TILE_HEIGHT = TILE_SIZE * TILE_ASPECT + SPACING;

const clamp = (value: number, min: number, max: number) => {
  "worklet";
  return Math.min(Math.max(value, min), max);
};

export const getOrder = (x: number, y: number, maxOrder: number) => {
  "worklet";
  const col = clamp(
    Math.floor((x + TILE_SIZE / 2) / TILE_WIDTH),
    0,
    COLUMNS - 1,
  );
  const row = Math.floor((y + (TILE_SIZE * TILE_ASPECT) / 2) / TILE_HEIGHT);
  const order = row * COLUMNS + col;
  return clamp(order, 0, maxOrder);
};

export const getPosition = (order: number) => {
  "worklet";
  return {
    x: (order % COLUMNS) * TILE_WIDTH,
    y: Math.floor(order / COLUMNS) * TILE_HEIGHT,
  };
};

export interface OffsetData {
  [id: string]: { order: number; x: number; y: number };
}

export interface SortableItemProps {
  id: string;
  uri: string;
  itemCount: number;
  offsets: SharedValue<OffsetData>;
  activeId: SharedValue<string | null>;
  onDragEnd: () => void;
  onDelete: (id: string) => void;
}

export const SortableItem = ({
  id,
  uri,
  itemCount,
  offsets,
  activeId,
  onDragEnd,
  onDelete,
}: SortableItemProps) => {
  const { theme } = useTheme();
  const isGestureActive = useSharedValue(false);
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const position = useDerivedValue(() => {
    const item = offsets.value[id];
    return item ? getPosition(item.order) : { x: 0, y: 0 };
  });

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(150)
    .onStart(() => {
      isGestureActive.value = true;
      activeId.value = id;
      startX.value = position.value.x;
      startY.value = position.value.y;
    })
    .onUpdate((e) => {
      translationX.value = e.translationX;
      translationY.value = e.translationY;

      // We need to calculate order changes
      const currentOrder = offsets.value[id]?.order;
      if (currentOrder === undefined) return;

      const maxOrder = itemCount - 1;
      // Calculate where the center of the dragging item is
      const blobX = startX.value + translationX.value;
      const blobY = startY.value + translationY.value;

      const newOrder = getOrder(blobX, blobY, maxOrder);

      // If order changed, update offsets locally for other items to shift
      if (newOrder !== currentOrder) {
        // Find the item that currently holds the newOrder
        const idToSwap = Object.keys(offsets.value).find(
          (key) => offsets.value[key].order === newOrder,
        );

        if (idToSwap) {
          const newOffsets = { ...offsets.value };
          newOffsets[id].order = newOrder;
          newOffsets[idToSwap].order = currentOrder;
          offsets.value = newOffsets;
        }
      }
    })
    .onEnd(() => {
      isGestureActive.value = false;
      activeId.value = null;
      translationX.value = withTiming(0);
      translationY.value = withTiming(0);
      runOnJS(onDragEnd)();
    });

  const rStyle = useAnimatedStyle(() => {
    const isActive = isGestureActive.value;
    const zIndex = isActive ? 100 : 1;
    const scale = withTiming(isActive ? 1.05 : 1);

    const translateX = isActive
      ? startX.value + translationX.value
      : withTiming(position.value.x);

    const translateY = isActive
      ? startY.value + translationY.value
      : withTiming(position.value.y);

    return {
      position: "absolute",
      top: 0,
      left: 0,
      width: TILE_SIZE,
      height: TILE_SIZE * TILE_ASPECT,
      zIndex,
      transform: [{ translateX }, { translateY }, { scale }],
      shadowColor: "#000",
      shadowOpacity: withTiming(isActive ? 0.3 : 0),
      shadowRadius: withTiming(isActive ? 12 : 0),
      elevation: isActive ? 8 : 0,
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={rStyle}>
        <View
          style={[
            styles.imageContainer,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.borderPrimary,
            },
          ]}
        >
          <Image source={{ uri }} style={styles.image} contentFit="cover" />
          <Pressable
            style={[
              styles.deleteButton,
              { backgroundColor: theme.error || "#FF3B30" },
            ]}
            onPress={() => onDelete(id)}
          >
            <Ionicons name="trash-outline" size={14} color="#FFF" />
          </Pressable>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  image: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  deleteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
});
