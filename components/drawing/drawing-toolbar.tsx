import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import { Pressable } from "../themed";
import { Image } from "expo-image";
import Animated, {
  cancelAnimation,
  withRepeat,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  ic_flash,
  ic_flip_image,
  ic_lock,
  ic_video_preview,
} from "@/assets/icons";
import { FontFamily } from "@/constants/fonts";

interface DrawingToolbarProps {
  onLock?: () => void;
  onFlip?: () => void;
  onRecord?: () => void;
  onFlash?: () => void;
  isLocked?: boolean;
  isRecording?: boolean;
  recordingDurationSec?: number;
}

const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  onLock,
  onFlip,
  onRecord,
  onFlash,
  isLocked,
  isRecording = false,
  recordingDurationSec = 0,
}) => {
  const recordPulse = useSharedValue(1);
  const buttonWidth = useSharedValue(36);

  useEffect(() => {
    if (isRecording) {
      buttonWidth.value = withTiming(88, { duration: 250 });
      recordPulse.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 700 }),
          withTiming(1, { duration: 700 }),
        ),
        -1,
        false,
      );
      return;
    }

    buttonWidth.value = withTiming(36, { duration: 200 });
    cancelAnimation(recordPulse);
    recordPulse.value = withSpring(1);
  }, [isRecording]);

  const recordDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: recordPulse.value }],
  }));

  const animatedButtonStyle = useAnimatedStyle(() => ({
    width: buttonWidth.value,
  }));

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${mins}:${secs}`;
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={onLock} style={styles.iconButton}>
        <Image source={ic_lock} style={styles.iconStyle} contentFit="contain" />
      </Pressable>

      <Pressable onPress={onFlip} style={styles.iconButton} disabled={isLocked}>
        <Image
          source={ic_flip_image}
          style={styles.iconStyle}
          contentFit="contain"
        />
      </Pressable>

      <Pressable
        onPress={onRecord}
        style={styles.iconButton}
        disabled={isLocked}
      >
        <Animated.View
          style={[
            styles.recordButton,
            isRecording && styles.recordButtonActive,
            animatedButtonStyle,
          ]}
        >
          {isRecording ? (
            <>
              <Animated.View style={[styles.recordDot, recordDotStyle]} />
              <Text style={styles.recordLabel}>
                {formatRecordingTime(recordingDurationSec)}
              </Text>
            </>
          ) : (
            <Image
              source={ic_video_preview}
              style={styles.iconStyle}
              contentFit="contain"
            />
          )}
        </Animated.View>
      </Pressable>

      <Pressable
        onPress={onFlash}
        style={styles.iconButton}
        disabled={isLocked}
      >
        <Image
          source={ic_flash}
          style={styles.iconStyle}
          contentFit="contain"
        />
      </Pressable>
    </View>
  );
};

export default DrawingToolbar;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "90%",
    alignSelf: "center",
    backgroundColor: "rgba(5,5,5,0.5)",
    borderRadius: 15,
    marginBottom: 20,
  },
  iconButton: {
    padding: 8,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  recordButton: {
    height: 28,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    overflow: "hidden",
  },
  recordButtonActive: {
    backgroundColor: "rgba(255, 59, 48, 0.92)",
    paddingHorizontal: 8,
  },
  recordDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  recordLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: FontFamily.semibold,
  },
});
