import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { preview_1 } from "@/assets/images";
import Header from "@/components/header";
import PrimaryButton from "@/components/ui/primary-button";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";

const { width, height } = Dimensions.get("window");

const Preview = () => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const handleContinue = () => {
    // Navigate to next step or home
    router.push("/(tabs)/home");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <Header title="Preview" />

      {/* Main Content */}
      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
          <Image
            source={preview_1}
            style={styles.image}
            contentFit="cover" // Or contain depending on desired look
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
  card: {
    width: width * 0.85,
    height: height * 0.65,
    backgroundColor: "#E5E5E5", // Light grey card background
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
