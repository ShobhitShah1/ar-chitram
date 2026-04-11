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
  onSnapshot?: () => void;
  onFlash?: () => void;
  isLocked?: boolean;
  isRecording?: boolean;
  recordingDurationSec?: number;
  snapshotCount?: number;
  snapshotButtonRef?: React.RefObject<View | null>;
  onOpenPreview?: () => void;
}

const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  onLock,
  onFlip,
  onRecord,
  onSnapshot,
  onFlash,
  isLocked,
  isRecording = false,
  recordingDurationSec = 0,
  snapshotCount = 0,
  snapshotButtonRef,
  onOpenPreview,
}) => {
  const badgeScale = useSharedValue(1);
  const recordPulse = useSharedValue(1);
  const prevCount = useSharedValue(snapshotCount);

  useEffect(() => {
    if (snapshotCount > prevCount.value && snapshotCount > 0) {
      badgeScale.value = withSequence(
        withSpring(1.25, { damping: 15, stiffness: 500, mass: 0.3 }),
        withSpring(1, { damping: 15, stiffness: 400, mass: 0.4 }),
      );
    }
    prevCount.value = snapshotCount;
  }, [snapshotCount]);

  useEffect(() => {
    if (isRecording) {
      recordPulse.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 700 }),
          withTiming(1, { duration: 700 }),
        ),
        -1,
        false,
      );
      return;
    }

    cancelAnimation(recordPulse);
    recordPulse.value = 1;
  }, [isRecording, recordPulse]);

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));
  const recordDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: recordPulse.value }],
    opacity: isRecording ? 1 : 0.9,
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
        style={[
          styles.recordButton,
          isRecording ? styles.recordButtonActive : null,
        ]}
        disabled={isLocked}
      >
        <Ionicons
          name={isRecording ? "stop-circle" : "radio-button-on"}
          size={22}
          color="#FFFFFF"
        />
        {isRecording ? (
          <Animated.View style={[styles.recordDot, recordDotStyle]} />
        ) : null}
        <Text style={styles.recordLabel}>
          {isRecording ? formatRecordingTime(recordingDurationSec) : "REC"}
        </Text>
      </Pressable>

      <Pressable
        ref={snapshotButtonRef}
        onPress={onSnapshot}
        onLongPress={onOpenPreview}
        style={styles.iconButton}
        disabled={isLocked}
        collapsable={false}
      >
        <Image
          source={ic_video_preview}
          style={styles.iconStyle}
          contentFit="contain"
        />
        {snapshotCount > 0 && (
          <Animated.View style={[styles.badge, badgeAnimatedStyle]}>
            <Text style={styles.badgeText}>{snapshotCount}</Text>
          </Animated.View>
        )}
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
  recordButton: {
    minWidth: 84,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  recordButtonActive: {
    backgroundColor: "rgba(255, 59, 48, 0.92)",
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  recordLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: FontFamily.semibold,
  },
  recordDot: {
    position: "absolute",
    left: 10,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  badge: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: "#2A5FFF",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    zIndex: 10,
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontFamily: FontFamily.semibold,
  },
});
