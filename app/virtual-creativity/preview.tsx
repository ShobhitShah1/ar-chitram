import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { preview_1 } from "@/assets/images";
import Header from "@/components/header";
import PrimaryButton from "@/components/ui/primary-button";
import { useTheme } from "@/context/theme-context";

const { width, height } = Dimensions.get("window");

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
        <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
          <Image
            source={displayImage}
            style={styles.image}
            contentFit="contain"
          />
        </View>
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
  card: {
    width: width * 0.85,
    height: height * 0.65,
    backgroundColor: "#F5F5F5",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
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
