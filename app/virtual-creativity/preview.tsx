import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { preview_1 } from "@/assets/images";
import Header from "@/components/header";
import { StoryFramePreviewCard } from "@/components/story/story-frame-preview-card";
import PrimaryButton from "@/components/ui/primary-button";
import { useTheme } from "@/context/theme-context";

const VirtualCreativityPreview = () => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { imageUri } = useLocalSearchParams();

  const handleContinue = () => {
    // Navigate to Guide with the image Uri
    router.push({
      pathname: "/drawing/guide",
      params: { imageUri: imageUri },
    });
  };

  const displayImage = imageUri ? { uri: imageUri as string } : preview_1;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <Header title="" />

      {/* Main Content */}
      <View style={styles.content}>
        <StoryFramePreviewCard
          source={displayImage}
          cardBackgroundColor={theme.cardBackground}
        />
      </View>

      {/* Footer */}
      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 40) }]}
      >
        <PrimaryButton
          title="Continue"
          onPress={handleContinue}
          style={styles.button}
          colors={theme.drawingButton as any}
        />
      </View>
    </View>
  );
};

export default VirtualCreativityPreview;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  footer: {
    width: "100%",
    alignItems: "center",
  },
  button: {
    width: 160,
    borderRadius: 100,
    height: 50,
  },
});
