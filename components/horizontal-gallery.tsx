import React, { useEffect, useRef, useState } from "react";
import { Dimensions, FlatList, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { Pressable } from "./themed";
import { storage } from "@/utiles/storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const LIKED_IMAGES_STORAGE_KEY = "liked_gallery_images";

interface GalleryImage {
  id: string;
  image: string;
  isLiked?: boolean;
}

interface HorizontalGalleryProps {
  images: GalleryImage[];
  onImagePress?: (image: GalleryImage) => void;
  onLikePress?: (imageId: string, liked: boolean) => void;
}

const containerWidth = SCREEN_WIDTH - 32; // 16px padding on each side
const containerHeight = 550; // Fixed height that works well for most images

// Helper functions to manage liked images in storage
const getLikedImagesFromStorage = (): { [key: string]: boolean } => {
  try {
    const stored = storage.getString(LIKED_IMAGES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn("Failed to load liked images from storage:", error);
  }
  return {};
};

const saveLikedImagesToStorage = (likedImages: { [key: string]: boolean }) => {
  try {
    storage.setString(LIKED_IMAGES_STORAGE_KEY, JSON.stringify(likedImages));
  } catch (error) {
    console.warn("Failed to save liked images to storage:", error);
  }
};

export const HorizontalGallery: React.FC<HorizontalGalleryProps> = ({
  images,
  onImagePress,
  onLikePress,
}) => {
  const flatListRef = useRef<FlatList>(null);
  const [liked, setLiked] = useState<{ [key: string]: boolean }>({});

  const likeScale = useSharedValue(1);
  const scrollX = useSharedValue(0);

  // Load liked images from storage on mount
  useEffect(() => {
    const storedLikes = getLikedImagesFromStorage();
    setLiked(storedLikes);
  }, []);

  const handleLike = (imageId: string) => {
    const isLiked = !liked[imageId];
    const updatedLikes = { ...liked, [imageId]: isLiked };

    // Update state
    setLiked(updatedLikes);

    // Persist to storage
    saveLikedImagesToStorage(updatedLikes);

    // Notify parent
    onLikePress?.(imageId, isLiked);

    likeScale.value = withTiming(1.2, { duration: 100 }, () => {
      likeScale.value = withTiming(1, { duration: 100 });
    });
  };

  const likeButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const renderImage = ({
    item,
    index,
  }: {
    item: GalleryImage;
    index: number;
  }) => (
    <View
      style={[
        styles.imageContainer,
        { width: containerWidth, height: containerHeight },
      ]}
    >
      <Image
        source={{ uri: item.image }}
        style={styles.image}
        contentFit="contain"
      />

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.4)"]}
        style={styles.gradientOverlay}
        pointerEvents="none"
      />

      <View style={styles.overlay}>
        <Pressable
          onPress={() => handleLike(item.id)}
          style={styles.likeButtonContainer}
        >
          <Animated.View style={[styles.likeButton, likeButtonStyle]}>
            <Ionicons
              name={liked[item.id] ? "heart" : "heart-outline"}
              size={22}
              color={liked[item.id] ? "#FF3040" : "#FFFFFF"}
            />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );

  const onScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    scrollX.value = contentOffsetX;
  };

  const AnimatedIndicator = ({ index }: { index: number }) => {
    const animatedStyle = useAnimatedStyle(() => {
      const inputRange = [
        (index - 1) * containerWidth,
        index * containerWidth,
        (index + 1) * containerWidth,
      ];

      const width = interpolate(scrollX.value, inputRange, [6, 24, 6], "clamp");

      const opacity = interpolate(
        scrollX.value,
        inputRange,
        [0.4, 1, 0.4],
        "clamp"
      );

      return {
        width: withTiming(width, { duration: 150 }),
        opacity: withTiming(opacity, { duration: 150 }),
      };
    });

    return <Animated.View style={[styles.animatedIndicator, animatedStyle]} />;
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.carouselContainer,
          { width: containerWidth, height: containerHeight },
        ]}
      >
        <FlatList
          ref={flatListRef}
          data={images}
          renderItem={renderImage}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          snapToInterval={containerWidth}
          snapToAlignment="center"
          decelerationRate="fast"
          bounces={false}
          scrollEnabled={true}
          removeClippedSubviews={false}
          maxToRenderPerBatch={3}
          initialNumToRender={2}
          windowSize={5}
          getItemLayout={(data, index) => ({
            length: containerWidth,
            offset: containerWidth * index,
            index,
          })}
        />

        <View style={styles.fixedIndicatorOverlay}>
          {images.map((_, index) => (
            <AnimatedIndicator key={index} index={index} />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 8,
  },
  carouselContainer: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  imageContainer: {
    position: "relative",
    backgroundColor: "#1a1a1a",
  },
  image: {
    width: "100%",
    height: containerHeight,
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 30,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  likeButtonContainer: {
    alignItems: "center",
  },
  likeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  fixedIndicatorOverlay: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    zIndex: 10,
  },
  animatedIndicator: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 3,
  },
});
