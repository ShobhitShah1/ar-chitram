import { ACCENT_COLOR } from "@/constants/colors";
import { FontFamily } from "@/constants/fonts";
import { DownloadProgress } from "@/services/download-service";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface DownloadModalProps {
  visible: boolean;
  progress: DownloadProgress | null;
  onClose?: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  visible,
  progress,
  onClose,
}) => {
  const progressWidth = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const checkmarkScale = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const ringProgress = useSharedValue(0);
  const particleValues = Array.from({ length: 6 }).map(() => useSharedValue(0));
  const emojiBounce = useSharedValue(0);
  const emojiRotate = useSharedValue(0);

  // Animation sequences
  useEffect(() => {
    if (visible) {
      iconScale.value = withDelay(
        300,
        withSpring(1, {
          damping: 12,
          stiffness: 150,
          mass: 1,
          energyThreshold: 0.001,
        })
      );
      glowOpacity.value = withTiming(1, {
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
      });
      ringProgress.value = withTiming(progress?.progress || 0, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
      emojiBounce.value = withRepeat(
        withSequence(
          withTiming(10, { duration: 500, easing: Easing.out(Easing.quad) }),
          withTiming(-10, { duration: 500, easing: Easing.in(Easing.quad) })
        ),
        -1,
        true
      );
      emojiRotate.value = withRepeat(
        withTiming(360, { duration: 2000, easing: Easing.linear }),
        -1
      );
    } else {
      iconScale.value = withTiming(0, { duration: 200 });
      glowOpacity.value = withTiming(0, { duration: 200 });
      ringProgress.value = withTiming(0, { duration: 200 });
      particleValues.forEach(
        (particle) => (particle.value = withTiming(0, { duration: 200 }))
      );
      emojiBounce.value = withTiming(0, { duration: 200 });
      emojiRotate.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  useEffect(() => {
    if (progress) {
      progressWidth.value = withTiming(progress.progress, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
      ringProgress.value = withTiming(progress.progress, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });

      if (progress.stage === "complete") {
        checkmarkScale.value = withSequence(
          withDelay(
            300,
            withSpring(1.3, {
              damping: 10,
              stiffness: 200,
              mass: 1,
              energyThreshold: 0.001,
            })
          ),
          withSpring(1, {
            damping: 12,
            stiffness: 150,
            mass: 1,
            energyThreshold: 0.001,
          })
        );
        particleValues.forEach((particle, index) => {
          particle.value = withDelay(
            index * 100,
            withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) })
          );
        });
      } else {
        particleValues.forEach(
          (particle) => (particle.value = withTiming(0, { duration: 200 }))
        );
      }
    }
  }, [progress]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
    opacity: iconScale.value,
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
    opacity: checkmarkScale.value,
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * 0.4,
  }));

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringProgress.value * 360}deg` }],
    opacity: ringProgress.value > 0 ? 0.6 : 0,
  }));

  const particleStyles = particleValues.map((particle, index) =>
    useAnimatedStyle(() => ({
      opacity: particle.value * 0.7,
      transform: [
        {
          translateX: particle.value * Math.cos((index * Math.PI) / 3) * 50,
        },
        {
          translateY: particle.value * Math.sin((index * Math.PI) / 3) * 50,
        },
        { scale: particle.value * 0.8 },
      ],
    }))
  );

  const emojiAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: emojiBounce.value },
      { rotate: `${emojiRotate.value}deg` },
    ],
  }));

  const getStageColor = () => {
    if (!progress) return ACCENT_COLOR;
    return progress.stage === "complete" ? "#4CAF50" : ACCENT_COLOR;
  };

  if (!visible || !progress) return null;

  return (
    <Modal
      visible={visible}
      statusBarTranslucent
      navigationBarTranslucent
      animationType="slide"
      transparent
    >
      <BlurView intensity={40} tint="dark" style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            { borderColor: `rgba(255, 255, 255, 0.2)` },
          ]}
        >
          <View style={styles.modal}>
            <Animated.View
              style={[
                styles.backgroundGlow,
                glowAnimatedStyle,
                {
                  backgroundColor: `rgba(${
                    progress.stage === "complete"
                      ? "76, 175, 80"
                      : "33, 150, 243"
                  }, 0.1)`,
                },
              ]}
            />

            <View style={styles.iconContainer}>
              <View style={styles.ringContainer}>
                <Animated.View style={[styles.progressRing, ringAnimatedStyle]}>
                  <LinearGradient
                    colors={[getStageColor(), "transparent"]}
                    style={styles.ringGradient}
                  />
                </Animated.View>
              </View>
              <Animated.View style={[styles.iconWrapper, iconAnimatedStyle]}>
                <LinearGradient
                  colors={[getStageColor(), `${getStageColor()}CC`]}
                  style={styles.iconBackground}
                >
                  {progress.stage === "complete" ? (
                    <Animated.View style={checkmarkAnimatedStyle}>
                      <Ionicons name="checkmark" size={48} color="#fff" />
                    </Animated.View>
                  ) : (
                    <Animated.Text style={[styles.emoji, emojiAnimatedStyle]}>
                      🚀
                    </Animated.Text>
                  )}
                </LinearGradient>
              </Animated.View>
              <View style={styles.particleContainer}>
                {progress.stage === "complete" &&
                  particleValues.map((_, index) => (
                    <Animated.View
                      key={index}
                      style={[styles.particle, particleStyles[index]]}
                    >
                      <View
                        style={[
                          styles.particleDot,
                          { backgroundColor: getStageColor() },
                        ]}
                      />
                    </Animated.View>
                  ))}
              </View>
            </View>

            <View style={styles.contentContainer}>
              <Text style={styles.title}>
                {progress.stage === "complete"
                  ? "Download Complete!"
                  : "Downloading..."}
              </Text>
              <Text style={styles.message}>{progress.message}</Text>

              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarTrack}>
                  <Animated.View style={progressAnimatedStyle}>
                    <LinearGradient
                      colors={[getStageColor(), `${getStageColor()}CC`]}
                      style={styles.progressBarFill}
                    />
                  </Animated.View>
                </View>
                <Text style={[styles.progressText, { color: getStageColor() }]}>
                  {Math.round(progress.progress * 100)}%
                </Text>
              </View>

              <View style={styles.stageContainer}>
                <View
                  style={[
                    styles.stageDot,
                    { backgroundColor: getStageColor() },
                  ]}
                />
                <Text style={styles.stageText}>
                  {progress.stage.charAt(0).toUpperCase() +
                    progress.stage.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalContainer: {
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderRadius: 32,
    overflow: "hidden",
  },
  modal: {
    borderRadius: 32,
    padding: 28,
    alignItems: "center",
    backgroundColor: "rgba(20, 20, 20, 0.9)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  backgroundGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 32,
  },
  iconContainer: {
    position: "relative",
    width: 96,
    height: 96,
    marginBottom: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  ringContainer: {
    position: "absolute",
    width: 96,
    height: 96,
    justifyContent: "center",
    alignItems: "center",
  },
  progressRing: {
    position: "absolute",
    width: 96,
    height: 96,
    justifyContent: "center",
    alignItems: "center",
  },
  ringGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderStyle: "solid",
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  particleContainer: {
    position: "absolute",
    width: 96,
    height: 96,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  particle: {
    position: "absolute",
    width: 8,
    height: 8,
  },
  particleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.7,
  },
  contentContainer: {
    alignItems: "center",
    width: "100%",
  },
  title: {
    fontSize: 24,
    fontFamily: FontFamily.bold,
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#bbb",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  progressBarContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  progressBarTrack: {
    width: "100%",
    height: 10,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  progressText: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    marginTop: 8,
  },
  stageContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stageText: {
    fontSize: 14,
    color: "#ccc",
    fontFamily: FontFamily.semibold,
    textTransform: "capitalize",
  },
  emoji: {
    fontSize: 36,
    textAlign: "center",
  },
});
