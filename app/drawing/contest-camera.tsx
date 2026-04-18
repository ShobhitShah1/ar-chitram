import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import * as StoreReview from "expo-store-review";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import * as MediaLibrary from "expo-media-library";

import { CameraPermissionView } from "@/components/camera/camera-permission-view";
import PrimaryButton from "@/components/ui/primary-button";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { persistExhibitionCaptureReference } from "@/features/gallery/services/local-gallery-service";
import { clearAllLocalUploads } from "@/features/virtual-creativity/services/local-upload-asset-service";
import { useVirtualCreativityStore } from "@/features/virtual-creativity/store/virtual-creativity-store";
import { apiQueryKeys } from "@/services/api/query-keys";
import { saveToArChitramAlbum } from "@/services/media-save-service";
import { takeNormalizedStoryPicture } from "@/services/story-media-service";
import { useStoryFrameSize } from "@/hooks/use-story-frame-size";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utils/story-frame";

const ContestCamera = () => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const params = useLocalSearchParams();
  const resetStore = useVirtualCreativityStore((state) => state.reset);
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission] = MediaLibrary.usePermissions({
    writeOnly: true,
    granularPermissions: ["photo"],
  });
  const cameraRef = useRef<CameraView>(null);
  const overlayFrame = useStoryFrameSize({
    maxWidthRatio: 0.9,
    maxHeightRatio: 0.74,
  });

  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const overlayImageUri = Array.isArray(params.imageUri)
    ? params.imageUri[0]
    : params.imageUri;
  const originalImageUri = Array.isArray(params.originalImageUri)
    ? params.originalImageUri[0]
    : params.originalImageUri;
  const overlayOpacityParam = Array.isArray(params.overlayOpacity)
    ? params.overlayOpacity[0]
    : params.overlayOpacity;
  const imageScaleParam = Array.isArray(params.imageScale)
    ? params.imageScale[0]
    : params.imageScale;
  const imageTranslateXParam = Array.isArray(params.imageTranslateX)
    ? params.imageTranslateX[0]
    : params.imageTranslateX;
  const imageTranslateYParam = Array.isArray(params.imageTranslateY)
    ? params.imageTranslateY[0]
    : params.imageTranslateY;
  const imageRotationParam = Array.isArray(params.imageRotation)
    ? params.imageRotation[0]
    : params.imageRotation;

  const overlayOpacity = useMemo(() => {
    const parsed = Number(overlayOpacityParam);
    return Number.isFinite(parsed) ? parsed : 0.5;
  }, [overlayOpacityParam]);
  const imageScale = useMemo(() => {
    const parsed = Number(imageScaleParam);
    return Number.isFinite(parsed) ? parsed : 1;
  }, [imageScaleParam]);
  const imageTranslateX = useMemo(() => {
    const parsed = Number(imageTranslateXParam);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [imageTranslateXParam]);
  const imageTranslateY = useMemo(() => {
    const parsed = Number(imageTranslateYParam);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [imageTranslateYParam]);
  const imageRotation = useMemo(() => {
    const parsed = Number(imageRotationParam);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [imageRotationParam]);

  const handleBackToHome = useCallback(() => {
    resetStore();
    void clearAllLocalUploads();
    void queryClient.invalidateQueries({
      queryKey: apiQueryKeys.assets.localUploads,
    });
    router.replace("/(tabs)/home");
  }, [queryClient, resetStore]);

  const ensureGalleryPermission = useCallback(async () => {
    const current = await MediaLibrary.getPermissionsAsync(false, ["photo"]);
    if (current.granted) {
      return true;
    }

    let nextPermission = current;
    if (current.canAskAgain) {
      nextPermission = await MediaLibrary.requestPermissionsAsync(false, [
        "photo",
      ]);
    }

    if (!nextPermission.granted && nextPermission.canAskAgain) {
      nextPermission = await MediaLibrary.requestPermissionsAsync(true, [
        "photo",
      ]);
    }

    if (nextPermission.granted) {
      return true;
    }

    Alert.alert(
      "Allow Photo Access",
      "Enable photo permission in Settings so Ar Chitram can save your contest image to Exhibition.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => {
            void Linking.openSettings();
          },
        },
      ],
    );
    return false;
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!permission?.granted) {
        void requestPermission();
      }
      if (!mediaPermission?.granted) {
        void ensureGalleryPermission();
      }

      if (Platform.OS !== "android") {
        return undefined;
      }

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          handleBackToHome();
          return true;
        },
      );

      return () => subscription.remove();
    }, [
      handleBackToHome,
      ensureGalleryPermission,
      mediaPermission?.granted,
      permission?.granted,
      requestPermission,
    ]),
  );

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || processing) {
      return;
    }

    try {
      setProcessing(true);
      const normalizedUri = await takeNormalizedStoryPicture(
        cameraRef.current,
        {
          quality: 1,
          targetWidth: STORY_FRAME_WIDTH,
          targetHeight: STORY_FRAME_HEIGHT,
          fit: "contain",
        },
      );

      if (normalizedUri) {
        setCapturedUri(normalizedUri);
      }
    } catch (error) {
      console.error("Contest capture failed", error);
    } finally {
      setProcessing(false);
    }
  }, [processing]);

  const handleRetake = useCallback(() => {
    setCapturedUri(null);
  }, []);

  const handleJoinContest = useCallback(async () => {
    if (!capturedUri || processing) {
      return;
    }

    try {
      setProcessing(true);

      try {
        const hasMediaPermission = await ensureGalleryPermission();
        if (!hasMediaPermission) {
          throw new Error("Storage permission not granted");
        }

        const asset = await saveToArChitramAlbum(capturedUri);
        await persistExhibitionCaptureReference({
          assetId: asset.id,
          assetUri: asset.uri,
          originalUri: originalImageUri ?? overlayImageUri ?? capturedUri,
        });
      } catch (error) {
        console.warn(
          "Contest image could not be saved to gallery before share",
          error,
        );
      }

      await clearAllLocalUploads();
      void queryClient.invalidateQueries({
        queryKey: apiQueryKeys.assets.localUploads,
      });
      resetStore();

      try {
        const canPromptReview = await StoreReview.hasAction();
        if (canPromptReview) {
          await StoreReview.requestReview();
        }
      } catch (error) {
        console.warn("Store review prompt failed", error);
      }

      router.push({
        pathname: "/drawing/share",
        params: { imageUri: capturedUri },
      });
    } finally {
      setProcessing(false);
    }
  }, [
    capturedUri,
    originalImageUri,
    overlayImageUri,
    ensureGalleryPermission,
    processing,
    queryClient,
    resetStore,
  ]);

  if (!permission) {
    return <View style={[styles.container, { backgroundColor: "black" }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <CameraPermissionView
          canAskAgain={permission.canAskAgain}
          onRequestPermission={() => {
            void requestPermission();
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!capturedUri ? (
        <>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
          />
        </>
      ) : (
        <Image
          source={{ uri: capturedUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      )}

      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToHome}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 28) }]}
      >
        {!capturedUri ? (
          <>
            <Text style={styles.description}>
              Position your drawing and take the contest photo here.
            </Text>
            <PrimaryButton
              title={processing ? "Capturing..." : "Take Picture"}
              onPress={handleCapture}
              style={styles.primaryButton}
              colors={["#fff", "#fff"]}
              textStyle={{ color: "#000", fontSize: 13 }}
              disabled={processing}
            />
          </>
        ) : (
          <>
            <Text style={styles.description}>
              Confirm this photo to join the contest or retake it.
            </Text>
            <View style={styles.actionRow}>
              <PrimaryButton
                title="Retake"
                onPress={handleRetake}
                style={styles.secondaryButton}
                colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0.18)"]}
                disabled={processing}
                textStyle={{ color: "#fff", fontSize: 13 }}
              />
              <PrimaryButton
                title={processing ? "Processing..." : "Join Contest"}
                onPress={handleJoinContest}
                style={styles.primaryButton}
                colors={["#fff", "#fff"]}
                textStyle={{ color: "#000", fontSize: 13 }}
                disabled={processing}
              />
            </View>
          </>
        )}
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
  overlayStage: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayImage: {
    position: "absolute",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 14,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  description: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: FontFamily.medium,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    width: "100%",
    maxWidth: 340,
    marginBottom: 16,
  },
  actionRow: {
    width: "100%",
    maxWidth: 360,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  primaryButton: {
    width: 140,
    height: 46,
    borderRadius: 23,
  },
  secondaryButton: {
    width: 130,
    height: 46,
    borderRadius: 23,
  },
});
