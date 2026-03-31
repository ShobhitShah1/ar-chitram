import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontFamily } from "@/constants/fonts";
import { CameraPermissionView } from "@/components/camera/camera-permission-view";
import { Ionicons } from "@expo/vector-icons";
import PrimaryButton from "@/components/ui/primary-button";
import { saveToArChitramAlbum } from "@/services/media-save-service";
import { takeNormalizedStoryPicture } from "@/services/story-media-service";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utils/story-frame";
import { clearAllLocalUploads } from "@/features/virtual-creativity/services/local-upload-asset-service";
import { useVirtualCreativityStore } from "@/features/virtual-creativity/store/virtual-creativity-store";
import { useQueryClient } from "@tanstack/react-query";
import { apiQueryKeys } from "@/services/api/query-keys";

const ContestCamera = () => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const resetStore = useVirtualCreativityStore((state) => state.reset);

  React.useEffect(() => {
    // Clear everything once we reach the contest screen
    const cleanup = async () => {
      await clearAllLocalUploads();
      void queryClient.invalidateQueries({
        queryKey: apiQueryKeys.assets.localUploads,
      });
      // Reset the store to clear snapshots and layers for the next session
      resetStore();
    };
    void cleanup();
  }, [queryClient, resetStore]);

  const handleBack = () => {
    resetStore();
    router.back();
  };

  const handleJoinContest = async () => {
    if (cameraRef.current && !processing) {
      try {
        setProcessing(true);
        const normalizedUri = await takeNormalizedStoryPicture(
          cameraRef.current,
          {
            quality: 0.8,
            targetWidth: STORY_FRAME_WIDTH,
            targetHeight: STORY_FRAME_HEIGHT,
            fit: "contain",
          },
        );

        if (normalizedUri) {
          try {
            await saveToArChitramAlbum(normalizedUri);
          } catch (error) {
            console.warn(
              "Contest image was captured but could not be saved to gallery",
              error,
            );
          }

          resetStore();
          void clearAllLocalUploads();

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
        <Text style={styles.description}>
          Capture your artwork to join the contest and share with the world!
        </Text>
        <PrimaryButton
          title={processing ? "Processing..." : "Join Contest"}
          onPress={handleJoinContest}
          style={styles.captureButton}
          colors={["#fff", "#fff"]}
          textStyle={{ color: "#000" }}
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
    fontFamily: FontFamily.medium,
    fontSize: 15,
    lineHeight: 20,
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
