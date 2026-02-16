import React from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

interface OpacitySliderProps {
  value: SharedValue<number>; // Value between 0 and 1
  width?: number;
}

const THUMB_SIZE = 24;
const TRACK_HEIGHT = 4;

const OpacitySlider: React.FC<OpacitySliderProps> = ({
  value,
  width = 250,
}) => {
  const isPressed = useSharedValue(false);
  const context = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onStart(() => {
      isPressed.value = true;
      context.value = value.value;
    })
    .onUpdate((e) => {
      const newValue = context.value + e.translationX / width;
      value.value = Math.min(Math.max(newValue, 0), 1);
    })
    .onEnd(() => {
      isPressed.value = false;
    });

  const thumbStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: value.value * width }],
      scale: withSpring(isPressed.value ? 1.2 : 1),
    };
  });

  const filledTrackStyle = useAnimatedStyle(() => {
    return {
      width: value.value * width,
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.container, { width: width + THUMB_SIZE }]}>
        <View style={styles.trackContainer}>
          {/* Background Track */}
          <View style={[styles.track, { width }]} />

          {/* Filled Track */}
          <Animated.View style={[styles.filledTrack, filledTrackStyle]} />

          {/* Thumb */}
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </View>
      </View>
    </GestureDetector>
  );
};

export default OpacitySlider;

const styles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  trackContainer: {
    height: 40,
    justifyContent: "center",
    width: "100%",
    alignItems: "flex-start",
    paddingLeft: THUMB_SIZE / 2,
  },
  track: {
    height: TRACK_HEIGHT,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: TRACK_HEIGHT / 2,
    position: "absolute",
    left: THUMB_SIZE / 2,
  },
  filledTrack: {
    height: TRACK_HEIGHT,
    backgroundColor: "#007AFF",
    borderRadius: TRACK_HEIGHT / 2,
    position: "absolute",
    left: THUMB_SIZE / 2,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: "white",
    position: "absolute",
    left: 0,
    // centering thumb vertically on track is handled by container center alignment
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
