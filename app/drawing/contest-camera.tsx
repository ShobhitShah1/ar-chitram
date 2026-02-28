import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontFamily } from "@/constants/fonts";
import { CameraPermissionView } from "@/components/camera/camera-permission-view";
import { Ionicons } from "@expo/vector-icons";
import PrimaryButton from "@/components/ui/primary-button";
import { takeNormalizedStoryPicture } from "@/services/story-media-service";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utiles/story-frame";

const ContestCamera = () => {
  const insets = useSafeAreaInsets();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const handleBack = () => {
    router.back();
  };

  const handleJoinContest = async () => {
    if (cameraRef.current && !processing) {
      try {
        setProcessing(true);
        const normalizedUri = await takeNormalizedStoryPicture(cameraRef.current, {
          quality: 0.8,
          targetWidth: STORY_FRAME_WIDTH,
          targetHeight: STORY_FRAME_HEIGHT,
          fit: "contain",
        });

        // Mock API call delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (normalizedUri) {
          router.push({
            pathname: "/drawing/share",
            params: { imageUri: normalizedUri },
          });
        }
      } catch (e) {
        console.error("Failed to take photo", e);
      } finally {
        setProcessing(false);
      }
    }
  };

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <CameraPermissionView
        canAskAgain={permission.canAskAgain}
        onRequestPermission={() => {
          void requestPermission();
        }}
        subtitle="Camera is required to capture your artwork and join the contest."
      />
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        ref={cameraRef}
        facing={facing}
        ratio="16:9"
      />

      {/* Overlay UI */}
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.bottomContainer,
          { paddingBottom: Math.max(insets.bottom, 40) },
        ]}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="camera" size={40} color="#555" />
        </View>
        <Text style={styles.description}>
          Capture your artwork to join the contest and share with the world!
        </Text>
        <PrimaryButton
          title={processing ? "Processing..." : "Join Contest"}
          onPress={handleJoinContest}
          style={styles.captureButton}
          colors={["#fff", "#fff"]} // White button
          textStyle={{ color: "#000" }} // Black text
          disabled={processing}
        />
      </View>
    </View>
  );
};

export default ContestCamera;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: 20,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 30,
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.3)", // Slight gradient/overlay
  },
  iconContainer: {
    marginBottom: 20,
    opacity: 0.8,
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  captureButton: {
    width: 200,
    height: 50,
    borderRadius: 25,
  },
});
