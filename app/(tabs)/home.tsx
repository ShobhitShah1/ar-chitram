import { HorizontalGallery } from "@/components/horizontal-gallery";
import { StoryRow } from "@/components/story/story-row";
import TabsHeader from "@/components/tabs-header";
import { View } from "@/components/themed";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import React from "react";
import { Platform, StatusBar, StyleSheet } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated from "react-native-reanimated";

export default function Home() {
  const { theme } = useTheme();

  const contestStoryData: any[] = [];
  const galleryImages: any[] = [];

  const handleLikePress = () => {};

  return (
    <View style={{ paddingTop: (StatusBar.currentHeight ?? 0) + 10, flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TabsHeader />

        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {contestStoryData.length > 0 && (
            <View style={styles.storiesSection}>
              <StoryRow
                stories={contestStoryData}
                contestStoryData={contestStoryData}
              />
            </View>
          )}

          {galleryImages?.length > 0 && (
            <View style={styles.gallerySection}>
              <HorizontalGallery
                images={galleryImages}
                onImagePress={() => {}}
                onLikePress={handleLikePress}
              />
            </View>
          )}
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  storiesSection: {
    // marginTop: 10,
  },
  gallerySection: {
    marginVertical: 0,
  },
  roomCodeSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  roomsGridSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  roomsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  roomCardWrapper: {
    width: "48%",
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 30,
    paddingVertical: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    overflow: "hidden",
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 15,
    fontFamily: FontFamily.medium,
  },
  roomCodeInputContainer: {
    flex: 1,
  },
  joinButton: {
    width: 48,
    height: 48,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
});
