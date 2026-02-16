import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import { Pressable } from "../themed";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
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
  snapshotCount?: number;
  snapshotButtonRef?: React.RefObject<View | null>;
  onOpenPreview?: () => void;
}

const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  onLock,
  onFlip,
  onRecord,
  onFlash,
  isLocked,
  snapshotCount = 0,
  snapshotButtonRef,
  onOpenPreview,
}) => {
  const badgeScale = useSharedValue(1);
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

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

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
        ref={snapshotButtonRef}
        onPress={onRecord}
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
  iconStyle: {
    width: 20,
    height: 20,
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
