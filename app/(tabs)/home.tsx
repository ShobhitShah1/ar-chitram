import { EmptyState } from "@/components/empty-state";
import { HorizontalGallery } from "@/components/horizontal-gallery";
import { ImageUploadFlowModal } from "@/features/virtual-creativity/components/image-upload-flow-modal";
import { fetchLocalUploadTabAssets, persistLocalUploadAsset } from "@/features/virtual-creativity/services/local-upload-asset-service";
import { StoryRow } from "@/components/story/story-row";
import TabsHeader from "@/components/tabs-header";
import { View } from "@/components/themed";
import { FontFamily } from "@/constants/fonts";
import { useHomeTabAssets } from "@/hooks/api";
import { useImageUploadFlow } from "@/features/virtual-creativity/hooks/use-image-upload-flow";
import { apiQueryKeys } from "@/services/api/query-keys";
import { useVirtualCreativityStore } from "@/features/virtual-creativity/store/virtual-creativity-store";
import { useQueryClient } from "@tanstack/react-query";
import { useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "expo-router";
import React from "react";
import {
  InteractionManager,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated from "react-native-reanimated";

export default function Home() {
  const clearPendingUploadUris = useVirtualCreativityStore(
    (state) => state.clearPendingUploadUris,
  );
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useHomeTabAssets();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [refreshing, setRefreshing] = React.useState(false);
  const hasAutoRequestedPermission = React.useRef(false);
  const { startUploadFlow, modalProps } = useImageUploadFlow({
    title: "Start With Your Photo",
    description:
      "Upload one image, preview the background removal, then save it for Virtual Creativity.",
    doneLabel: "Save",
    onComplete: async ({ finalUri }) => {
      await persistLocalUploadAsset(finalUri);
      clearPendingUploadUris();
      queryClient.setQueryData(
        apiQueryKeys.assets.localUploads,
        await fetchLocalUploadTabAssets(),
      );
    },
  });

  const onRefresh = React.useCallback(() => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    void refetch().finally(() => {
      setRefreshing(false);
    });
  }, [refetch, refreshing]);

  useFocusEffect(
    React.useCallback(() => {
      const canAutoRequest =
        cameraPermission &&
        !cameraPermission.granted &&
        cameraPermission.canAskAgain &&
        !hasAutoRequestedPermission.current;

      if (canAutoRequest) {
        hasAutoRequestedPermission.current = true;
        InteractionManager.runAfterInteractions(() => {
          void requestCameraPermission();
        });
      }
    }, [cameraPermission, requestCameraPermission]),
  );

  const contestStoryData = data?.stories ?? [];
  const galleryImages = data?.galleryImages ?? [];
  const hasHomeContent =
    contestStoryData.length > 0 || galleryImages.length > 0;
  const isInitialLoading = isLoading && !hasHomeContent;
  const showErrorState = isError && !hasHomeContent;

  const handleLikePress = () => {};

  const handleUploadPress = React.useCallback(() => {
    void startUploadFlow();
  }, [startUploadFlow]);

  return (
    <View style={{ paddingTop: (StatusBar.currentHeight ?? 0) + 10, flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TabsHeader onUploadPress={handleUploadPress} />

        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#000000"]}
              tintColor="#000000"
            />
          }
        >
          {isInitialLoading ? (
            <EmptyState
              showLoading
              title="Loading home assets..."
              containerStyle={{ minHeight: 240 }}
            />
          ) : showErrorState ? (
            <EmptyState
              title="Unable to load home assets"
              description="Please try again in a moment."
              containerStyle={{ minHeight: 240 }}
            />
          ) : contestStoryData.length > 0 ? (
            <View style={styles.storiesSection}>
              <StoryRow
                stories={contestStoryData}
                contestStoryData={contestStoryData}
              />
            </View>
          ) : null}

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

      <ImageUploadFlowModal {...modalProps} />
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
