import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export const AnimatedIcon = ({ name, color }: { name: any; color: string }) => {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { 
      damping: 15, 
      stiffness: 200,
      mass: 1,
      energyThreshold: 0.001
    });
    opacity.value = withTiming(1, { duration: 400 });
  }, [name]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name={name} size={28} color={color} />
    </Animated.View>
  );
};
