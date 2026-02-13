import { Story } from "@/constants/interface";
import { getProfileImageUrl } from "@/utiles/asset-url";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useRef, useState } from "react";
import { Dimensions, Modal, Pressable, StyleSheet, View } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { Text } from "../themed";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const STORY_DURATION = 5000; // 5 seconds per story

const SMOOTH_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);
const BOUNCY_EASING = Easing.bezier(0.175, 0.885, 0.32, 1.275);

// Loading spinner component
const LoadingSpinner = React.memo(() => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    const animate = () => {
      rotation.value = withTiming(
        360,
        {
          duration: 1000,
          easing: Easing.linear,
        },
        (finished) => {
          if (finished) {
            rotation.value = 0;
            scheduleOnRN(animate);
          }
        }
      );
    };
    animate();
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return <Animated.View style={[styles.loadingSpinner, animatedStyle]} />;
});

// Story Image component to handle individual image animations
const StoryImage = React.memo(
  ({
    story,
    index,
    currentIndex,
    imageLoaded,
    setImageLoaded,
    setImageError,
    startProgressTimer,
  }: {
    story: Story;
    index: number;
    currentIndex: number;
    imageLoaded: Record<number, boolean>;
    setImageLoaded: (
      fn: (prev: Record<number, boolean>) => Record<number, boolean>
    ) => void;
    setImageError: (
      fn: (prev: Record<number, boolean>) => Record<number, boolean>
    ) => void;
    startProgressTimer: (index: number) => void;
  }) => {
    const imageOpacity = useSharedValue(imageLoaded[index] ? 1 : 0);

    const imageAnimatedStyle = useAnimatedStyle(() => ({
      opacity: imageOpacity.value,
    }));

    useEffect(() => {
      if (imageLoaded[index]) {
        imageOpacity.value = withTiming(1, {
          duration: 200,
          easing: SMOOTH_EASING,
        });
      } else {
        imageOpacity.value = 0;
      }
    }, [imageLoaded[index]]);

    return (
      <Animated.View style={[styles.imageWrapper, imageAnimatedStyle]}>
        <Image
          source={{
            uri: story.image,
            cacheKey: `story-${story._id}-${index}`,
          }}
          style={styles.storyImage}
          contentFit="contain"
          priority={index === currentIndex ? "high" : "normal"}
          cachePolicy="memory-disk"
          recyclingKey={`story-${story._id}`}
          onLoad={() => {
            setImageLoaded((prev) => ({ ...prev, [index]: true }));
            setImageError((prev) => ({ ...prev, [index]: false }));
          }}
          onError={() => {
            setImageError((prev) => ({ ...prev, [index]: true }));
            setImageLoaded((prev) => ({ ...prev, [index]: false }));
          }}
        />
      </Animated.View>
    );
  }
);

// Create a separate component for the progress bar to avoid calling hooks in a loop
const ProgressBar = React.memo(
  ({
    progress,
    currentIndex,
    index,
  }: {
    progress: SharedValue<number>;
    currentIndex: number;
    index: number;
  }) => {
    const derivedProgress = useDerivedValue(() => {
      if (index < currentIndex) return 1;
      if (index > currentIndex) return 0;
      return progress.value;
    });

    const progressAnimatedStyle = useAnimatedStyle(() => ({
      width: `${derivedProgress.value * 100}%`,
    }));

    return (
      <View style={styles.progressBarBackground}>
        <Animated.View style={[styles.progressBar, progressAnimatedStyle]} />
      </View>
    );
  }
);

interface StoryViewerModalProps {
  visible: boolean;
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  isLikeEnabled: boolean;
  onLikePress: (id: string) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  visible,
  stories,
  initialIndex = 0,
  onClose,
  isLikeEnabled,
  onLikePress,
}) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({});
  const [imageError, setImageError] = useState<Record<number, boolean>>({});
  const [isClosing, setIsClosing] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const translateX = useSharedValue(-initialIndex * screenWidth);
  const progress = useSharedValue(0);
  const isMountedRef = useRef(true);
  const isMountedShared = useSharedValue(1);

  // Modal visibility animations
  const modalScale = useSharedValue(0.7);
  const modalOpacity = useSharedValue(0);
  const modalTranslateY = useSharedValue(screenHeight * 0.1);

  const safeHandleClose = () => {
    try {
      handleClose();
    } catch (error) {
      console.error("Error in safeHandleClose:", error);
    }
  };

  const safeGoToIndex = (index: number, animate: boolean = true) => {
    try {
      goToIndex(index, animate);
    } catch (error) {
      console.error("Error in safeGoToIndex:", error);
    }
  };

  const handleTimerComplete = (index: number) => {
    "worklet";
    try {
      if (!isMountedShared.value) return;

      // If this is the last story (index is stories.length - 1), close modal
      if (index >= stories.length - 1) {
        scheduleOnRN(safeHandleClose);
      } else {
        // Otherwise, go to next story
        scheduleOnRN(safeGoToIndex, index + 1, true);
      }
    } catch (error) {
      console.error("Error in handleTimerComplete:", error);
    }
  };

  const startProgressTimer = (index: number) => {
    if (
      isClosing ||
      !isMountedRef.current ||
      !stories?.length ||
      isImageLoading
    ) {
      return;
    }

    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: STORY_DURATION, easing: Easing.linear },
      (finished) => {
        if (finished && !isClosing && isMountedShared.value) {
          handleTimerComplete(index);
        }
      }
    );
  };

  const goToIndex = (index: number, animate = true) => {
    if (
      !isMountedRef.current ||
      !stories?.length ||
      index < 0 ||
      index >= stories.length ||
      isClosing
    )
      return;

    cancelAnimation(progress);

    // Reset progress to 0 for the new story
    progress.value = 0;

    // Mark as loading if image isn't loaded yet
    if (!imageLoaded[index]) {
      setIsImageLoading(true);
    } else {
      setIsImageLoading(false);
    }

    if (animate) {
      translateX.value = withTiming(-index * screenWidth, {
        duration: 400,
        easing: SMOOTH_EASING,
      });
    } else {
      translateX.value = -index * screenWidth;
    }

    // Update current index - timer will be started by useEffect when image is loaded
    setCurrentIndex(index);
  };

  const pauseAnimation = () => {
    cancelAnimation(progress);
  };

  const resumeAnimation = () => {
    if (
      !isMountedRef.current ||
      !stories?.length ||
      !imageLoaded[currentIndex] ||
      isClosing ||
      isImageLoading
    )
      return;

    const remainingDuration = (1 - progress.value) * STORY_DURATION;
    progress.value = withTiming(
      1,
      { duration: remainingDuration, easing: Easing.linear },
      (finished) => {
        if (finished && !isClosing && isMountedShared.value) {
          handleTimerComplete(currentIndex);
        }
      }
    );
  };

  const handleCloseComplete = () => {
    "worklet";
    try {
      if (!isMountedShared.value) return;

      scheduleOnRN(setIsClosing, false);
      scheduleOnRN(onClose);
    } catch (error) {}
  };

  const handleClose = () => {
    if (isClosing || !isMountedRef.current) return;

    setIsClosing(true);

    // Cancel all animations immediately
    cancelAnimation(progress);
    cancelAnimation(modalScale);
    cancelAnimation(modalOpacity);
    cancelAnimation(modalTranslateY);
    cancelAnimation(translateX);

    modalScale.value = withTiming(0.8, {
      duration: 350,
      easing: Easing.bezier(0.4, 0, 0.6, 1),
    });
    modalTranslateY.value = withTiming(screenHeight * 0.6, {
      duration: 350,
      easing: Easing.bezier(0.4, 0, 0.6, 1),
    });
    modalOpacity.value = withTiming(
      0,
      {
        duration: 350,
        easing: Easing.bezier(0.4, 0, 0.6, 1),
      },
      (finished) => {
        if (finished && isMountedShared.value) {
          handleCloseComplete();
        }
      }
    );
  };

  // Handle image loading state and start timer when image is loaded
  useEffect(() => {
    const isCurrentImageLoaded = imageLoaded[currentIndex];

    if (isCurrentImageLoaded && !isClosing && isMountedRef.current) {
      setIsImageLoading(false);

      // Start timer after a small delay to ensure state is updated
      setTimeout(() => {
        if (isMountedRef.current && !isClosing) {
          progress.value = 0;
          progress.value = withTiming(
            1,
            { duration: STORY_DURATION, easing: Easing.linear },
            (finished) => {
              if (finished && !isClosing && isMountedShared.value) {
                handleTimerComplete(currentIndex);
              }
            }
          );
        }
      }, 100);
    } else if (!isCurrentImageLoaded) {
      setIsImageLoading(true);
      cancelAnimation(progress);
      progress.value = 0;
    }
  }, [imageLoaded[currentIndex], currentIndex, isClosing]);

  // Preload adjacent images to prevent flickering
  useEffect(() => {
    if (visible) {
      // Preload current and adjacent images
      const preloadImages = [
        currentIndex - 1,
        currentIndex,
        currentIndex + 1,
      ].filter((i) => i >= 0 && i < stories.length);

      preloadImages.forEach((index) => {
        if (
          stories[index] &&
          !imageLoaded[index] &&
          (stories?.[index]?.image || stories[index]?.image)
        ) {
          Image.prefetch(
            stories?.[index]?.image || stories[index]?.image || ""
          );
        }
      });
    }
  }, [visible, currentIndex, stories, imageLoaded]);

  useEffect(() => {
    if (visible && stories?.length) {
      isMountedRef.current = true;
      isMountedShared.value = 1;
      const safeInitialIndex = Math.max(
        0,
        Math.min(initialIndex, stories.length - 1)
      );

      setCurrentIndex(safeInitialIndex);
      setImageLoaded({});
      setImageError({});
      setIsClosing(false);
      setIsImageLoading(true);
      translateX.value = -safeInitialIndex * screenWidth;

      // Enhanced opening animation sequence
      modalScale.value = 0.7;
      modalTranslateY.value = screenHeight * 0.1;
      modalOpacity.value = 0;

      // Staggered animation for smooth entrance
      modalOpacity.value = withTiming(1, {
        duration: 400,
        easing: SMOOTH_EASING,
      });

      modalScale.value = withTiming(1, {
        duration: 500,
        easing: BOUNCY_EASING,
      });

      modalTranslateY.value = withTiming(0, {
        duration: 450,
        easing: SMOOTH_EASING,
      });

      safeGoToIndex(safeInitialIndex, false);
    } else if (!visible) {
      // Immediate cleanup when modal is hidden
      isMountedRef.current = false;
      isMountedShared.value = 0;

      // Cancel all animations aggressively
      cancelAnimation(progress);
      cancelAnimation(modalScale);
      cancelAnimation(modalOpacity);
      cancelAnimation(modalTranslateY);
      cancelAnimation(translateX);

      setImageLoaded({});
      setImageError({});
      setIsClosing(false);
      setIsImageLoading(false);
    }
  }, [visible, initialIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      isMountedShared.value = 0;
      cancelAnimation(progress);
      cancelAnimation(modalScale);
      cancelAnimation(modalOpacity);
      cancelAnimation(modalTranslateY);
      cancelAnimation(translateX);
    };
  }, []);

  const handleGestureBegin = () => {
    "worklet";
    try {
      if (!isClosing && isMountedShared.value) {
        scheduleOnRN(pauseAnimation);
      }
    } catch (error) {}
  };

  const handleGestureEnd = (event: any) => {
    "worklet";
    try {
      if (isClosing || !isMountedShared.value) return;

      const isHorizontal =
        Math.abs(event.translationX) > Math.abs(event.translationY);

      // Check for swipe down to close (more restrictive thresholds)
      if (
        !isHorizontal &&
        event.translationY > screenHeight * 0.25 &&
        event.velocityY > 500
      ) {
        scheduleOnRN(safeHandleClose);
        return;
      }

      // Reset modal animations if not closing with spring-like feel
      modalTranslateY.value = withTiming(0, {
        duration: 400,
        easing: Easing.bezier(0.175, 0.885, 0.32, 1.1),
      });
      modalOpacity.value = withTiming(1, {
        duration: 350,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
      modalScale.value = withTiming(1, {
        duration: 400,
        easing: Easing.bezier(0.175, 0.885, 0.32, 1.1),
      });

      // Handle horizontal swipes
      if (isHorizontal) {
        const threshold = screenWidth / 3;
        const velocity = Math.abs(event.velocityX);
        const velocityThreshold = 800;

        // Check velocity first for quick horizontal swipes
        if (velocity > velocityThreshold) {
          if (event.velocityX > 0) {
            // Swipe right = previous story
            if (currentIndex > 0 && stories?.length) {
              scheduleOnRN(safeGoToIndex, currentIndex - 1, true);
            }
            return;
          } else {
            // Swipe left = next story
            if (
              stories?.length &&
              currentIndex >= 0 &&
              currentIndex < stories.length - 1
            ) {
              scheduleOnRN(safeGoToIndex, currentIndex + 1, true);
            } else {
              scheduleOnRN(safeHandleClose);
            }
            return;
          }
        }

        // Then check distance threshold for horizontal swipes
        if (event.translationX < -threshold) {
          // Swipe left = next story
          if (
            stories?.length &&
            currentIndex >= 0 &&
            currentIndex < stories.length - 1
          ) {
            scheduleOnRN(safeGoToIndex, currentIndex + 1, true);
          } else {
            scheduleOnRN(safeHandleClose);
          }
        } else if (event.translationX > threshold) {
          // Swipe right = previous story
          if (currentIndex > 0 && stories?.length) {
            scheduleOnRN(safeGoToIndex, currentIndex - 1, true);
          }
        } else {
          translateX.value = withTiming(-currentIndex * screenWidth, {
            duration: 350,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          });
        }
      }

      scheduleOnRN(resumeAnimation);
    } catch (error) {}
  };

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      handleGestureBegin();
    })
    .onUpdate((event) => {
      if (isClosing) return;

      const isHorizontal =
        Math.abs(event.translationX) > Math.abs(event.translationY);
      const isVerticalDown = event.translationY > 0 && !isHorizontal;

      // Handle horizontal swipe for story navigation
      if (isHorizontal) {
        translateX.value = -currentIndex * screenWidth + event.translationX;
        modalTranslateY.value = 0; // Reset vertical translation
      }
      // Handle vertical swipe down for closing modal (only if significant downward movement)
      else if (isVerticalDown && event.translationY > 50) {
        modalTranslateY.value = event.translationY;
        const progress = Math.min(event.translationY / (screenHeight * 0.4), 1);
        modalOpacity.value = Math.max(0.3, 1 - progress * 0.7);
        modalScale.value = Math.max(0.8, 1 - progress * 0.2);
      }
    })
    .onEnd((event) => {
      handleGestureEnd(event);
    });

  const handleLongPressStart = () => {
    "worklet";
    try {
      if (!isClosing && isMountedShared.value) {
        scheduleOnRN(pauseAnimation);
      }
    } catch (error) {}
  };

  const handleLongPressEnd = () => {
    "worklet";
    try {
      if (!isClosing && isMountedShared.value) {
        scheduleOnRN(resumeAnimation);
      }
    } catch (error) {}
  };

  const longPressGesture = Gesture.LongPress()
    .minDuration(250)
    .onStart(() => {
      handleLongPressStart();
    })
    .onEnd(() => {
      handleLongPressEnd();
    });

  const composedGesture = Gesture.Race(panGesture, longPressGesture);

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value,
    transform: [
      { scale: modalScale.value },
      { translateY: modalTranslateY.value },
    ],
  }));

  const storyContainerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  if (!visible || !stories?.length) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[styles.container, modalAnimatedStyle]}>
          <View style={[styles.header, { paddingTop: insets.top }]}>
            <View style={styles.progressContainer}>
              {stories.map((_, index) => (
                <ProgressBar
                  key={index}
                  index={index}
                  currentIndex={currentIndex}
                  progress={progress}
                />
              ))}
            </View>
            <Pressable
              style={[styles.closeButton, { top: insets.top + 12 }]}
              onPress={handleClose}
            >
              <Ionicons name="close" size={28} color="white" />
            </Pressable>
          </View>

          {stories[currentIndex]?.username?.trim() && (
            <View
              style={{
                marginHorizontal: 20,
                marginTop: 60,
                flexDirection: "row",
                gap: 10,
                position: "absolute",
                zIndex: 99999,
              }}
            >
              <Image
                source={{
                  uri: getProfileImageUrl(
                    stories?.[currentIndex]?.profile_image
                  ),
                }}
                style={{ width: 40, height: 40, borderRadius: 500 }}
                contentFit="contain"
              />
              <View
                style={{ justifyContent: "center", alignItems: "flex-start" }}
              >
                <Text style={{ color: "white" }}>
                  {stories[currentIndex]?.username || ""}
                </Text>
                {/* <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Image
                    source={ic_heart}
                    style={{ width: 15, height: 15 }}
                    contentFit="contain"
                  />
                  <Text style={{ color: "white" }}>
                    {stories[currentIndex]?.like_count || 0}
                  </Text>
                </View> */}
              </View>
            </View>
          )}

          <GestureDetector gesture={composedGesture}>
            <Animated.View
              style={[
                styles.storyRow,
                storyContainerAnimatedStyle,
                { width: screenWidth * stories.length },
              ]}
            >
              {stories.map((story, index) => (
                <View
                  key={`${story._id}-${index}`}
                  style={styles.storyContainer}
                >
                  <StoryImage
                    story={story}
                    index={index}
                    currentIndex={currentIndex}
                    imageLoaded={imageLoaded}
                    setImageLoaded={setImageLoaded}
                    setImageError={setImageError}
                    startProgressTimer={startProgressTimer}
                  />

                  {/* Loading indicator */}
                  {!imageLoaded[index] && index === currentIndex && (
                    <View style={styles.loadingContainer}>
                      <LoadingSpinner />
                    </View>
                  )}

                  {/* Invisible tap zones for better UX indication */}
                  <Pressable
                    style={styles.tapZoneLeft}
                    onPress={() => {
                      if (
                        !isClosing &&
                        isMountedRef.current &&
                        currentIndex > 0 &&
                        stories?.length
                      ) {
                        safeGoToIndex(currentIndex - 1, true);
                      }
                    }}
                  />
                  <Pressable
                    style={styles.tapZoneRight}
                    onPress={() => {
                      if (
                        isClosing ||
                        !isMountedRef.current ||
                        !stories?.length
                      )
                        return;
                      if (
                        currentIndex >= 0 &&
                        currentIndex < stories.length - 1
                      ) {
                        safeGoToIndex(currentIndex + 1, true);
                      } else {
                        safeHandleClose();
                      }
                    }}
                  />
                </View>
              ))}
            </Animated.View>
          </GestureDetector>

          {isLikeEnabled && (
            <View style={styles.overlay}>
              <Pressable
                onPress={() => onLikePress(stories[currentIndex]._id)}
                style={styles.likeButtonContainer}
              >
                <View style={styles.likeButton}>
                  <Ionicons
                    name={
                      !stories[currentIndex]._id ? "heart" : "heart-outline"
                    }
                    size={22}
                    color={!stories[currentIndex]._id ? "#FF3040" : "#FFFFFF"}
                  />
                </View>
              </Pressable>
            </View>
            // <Pressable
            //   style={styles.likeButton}
            //   onPress={() => onLikePress(stories[currentIndex]._id)}
            // >
            //   <Ionicons name="heart" size={24} color="red" />
            // </Pressable>
          )}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  progressContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 4,
  },
  progressBarBackground: {
    flex: 1,
    height: 2.5,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "white",
  },
  closeButton: {
    position: "absolute",
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  storyRow: {
    flex: 1,
    flexDirection: "row",
  },
  storyContainer: {
    width: screenWidth,
    height: screenHeight,
    position: "relative",
    overflow: "hidden",
  },
  imageWrapper: {
    width: screenWidth,
    height: screenHeight,
    position: "absolute",
    top: 0,
    left: 0,
  },
  storyImage: {
    width: "100%",
    height: "100%",
  },
  tapZoneLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "50%",
    backgroundColor: "transparent",
    zIndex: 10,
  },
  tapZoneRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "50%",
    backgroundColor: "transparent",
    zIndex: 10,
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderTopColor: "white",
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 35,
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
});
