import React, { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface GalleryImageCardProps {
  imageUrl: string;
  isLiked?: boolean;
  onPress?: () => void;
  onLikePress?: (liked: boolean) => void;
  width?: number;
  height?: number;
}

export const GalleryImageCard: React.FC<GalleryImageCardProps> = ({
  imageUrl,
  isLiked = false,
  onPress,
  onLikePress,
  width = 280,
  height = 400,
}) => {
  const [liked, setLiked] = useState(isLiked);
  const scale = useSharedValue(1);
  const likeScale = useSharedValue(0);

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handleLikePress = () => {
    const newLikedState = !liked;
    setLiked(newLikedState);
    onLikePress?.(newLikedState);

    // Animate like button
    if (newLikedState) {
      likeScale.value = withSpring(1.3, undefined, () => {
        likeScale.value = withSpring(1);
      });
    }
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { 
        scale: liked ? 
          interpolate(likeScale.value, [0, 1.3, 1], [1, 1.3, 1]) : 
          1 
      }
    ],
  }));

  return (
    <AnimatedPressable
      style={[styles.container, { width, height }, cardAnimatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Image source={{ uri: imageUrl }} style={styles.image} />
      
      <View style={styles.overlay}>
        <AnimatedPressable
          style={[styles.likeButton, likeAnimatedStyle]}
          onPress={handleLikePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={[
            styles.likeButtonBackground,
            { backgroundColor: liked ? '#FF3040' : 'rgba(0,0,0,0.6)' }
          ]}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={20}
              color="#FFFFFF"
            />
          </View>
        </AnimatedPressable>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    marginHorizontal: 6,
    backgroundColor: "#F5F5F5",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  overlay: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  likeButton: {
    zIndex: 1,
  },
  likeButtonBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
});