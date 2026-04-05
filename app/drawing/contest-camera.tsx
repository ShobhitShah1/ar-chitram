import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

import PrimaryButton from "@/components/ui/primary-button";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { persistExhibitionCaptureReference } from "@/features/gallery/services/local-gallery-service";
import { clearAllLocalUploads } from "@/features/virtual-creativity/services/local-upload-asset-service";
import { useVirtualCreativityStore } from "@/features/virtual-creativity/store/virtual-creativity-store";
import { apiQueryKeys } from "@/services/api/query-keys";
import { saveToArChitramAlbum } from "@/services/media-save-service";

const ContestCamera = () => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const params = useLocalSearchParams();
  const resetStore = useVirtualCreativityStore((state) => state.reset);
  const [processing, setProcessing] = useState(false);

  const imageUri = Array.isArray(params.imageUri)
    ? params.imageUri[0]
    : params.imageUri;
  const originalImageUri = Array.isArray(params.originalImageUri)
    ? params.originalImageUri[0]
    : params.originalImageUri;

  const handleJoinContest = useCallback(async () => {
    if (!imageUri || processing) {
      return;
    }

    try {
      setProcessing(true);

      try {
        const asset = await saveToArChitramAlbum(imageUri);
        await persistExhibitionCaptureReference({
          assetId: asset.id,
          assetUri: asset.uri,
          originalUri: originalImageUri ?? imageUri,
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

      router.push({
        pathname: "/drawing/share",
        params: { imageUri },
      });
    } finally {
      setProcessing(false);
    }
  }, [imageUri, originalImageUri, processing, queryClient, resetStore]);

  return (
    <View style={[styles.container, { backgroundColor: "black" }]}>
      <View style={StyleSheet.absoluteFill}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
          />
        ) : null}
      </View>

      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 40) }]}
      >
        <Text style={[styles.description, { color: "rgba(255,255,255,0.8)" }]}>
          Use this drawing to join the contest and save it to Exhibition.
        </Text>
        <PrimaryButton
          title={processing ? "Processing..." : "Join Contest"}
          onPress={handleJoinContest}
          style={styles.captureButton}
          colors={["#fff", "#fff"]}
          textStyle={{ color: "#000" }}
          disabled={processing || !imageUri}
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
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 30,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  description: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  captureButton: {
    width: 220,
    height: 50,
    borderRadius: 25,
  },
});
