import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { preview_1 } from "@/assets/images";
import Header from "@/components/header";
import { StoryFramePreviewCard } from "@/components/story/story-frame-preview-card";
import { SignatureOverlay } from "@/components/signature/signature-overlay";
import PrimaryButton from "@/components/ui/primary-button";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";

const Preview = () => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { imageUri, originalImageUri, signatureText, signatureFont } =
    useLocalSearchParams();

  const handleContinue = () => {
    // Navigate to Guide step
    router.push({
      pathname: "/drawing/guide",
      params: {
        imageUri,
        originalImageUri: originalImageUri ?? imageUri,
      },
    });
  };

  const handleTrace = () => {
    router.push({
      pathname: "/drawing/trace-canvas" as any,
      params: {
        imageUri,
        originalImageUri: originalImageUri ?? imageUri,
        signatureText,
        signatureFont,
      },
    });
  };

  const displayImage = imageUri ? { uri: imageUri as string } : preview_1;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <Header title="Preview" />

      {/* Main Content */}
      <View style={styles.content}>
        <StoryFramePreviewCard
          source={displayImage}
          cardBackgroundColor={theme.cardBackground}
        >
          <SignatureOverlay
            signatureText={signatureText as any}
            signatureFontFamily={signatureFont as any}
          />
        </StoryFramePreviewCard>
      </View>

      {/* Footer */}
      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 40) }]}
      >
        <View style={styles.buttonRow}>
          <PrimaryButton
            title="Trace"
            onPress={handleTrace}
            style={styles.button}
            colors={theme.drawingButton as any}
          />
          <PrimaryButton
            title="Draw"
            onPress={handleContinue}
            style={styles.button}
            colors={theme.drawingButton as any}
          />
        </View>
      </View>
    </View>
  );
};

export default Preview;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: "#1C1C1E",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  footer: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  button: {
    flex: 1,
    maxWidth: 160,
    borderRadius: 100,
    height: 54,
  },
});
