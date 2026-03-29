import Header from "@/components/header";
import { EmptyState } from "@/components/empty-state";
import { Pressable, Text, View } from "@/components/themed";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import {
  deleteLocalUploadAsset,
  fetchLocalUploadTabAssets,
  persistLocalUploadAsset,
} from "@/features/virtual-creativity/services/local-upload-asset-service";
import { apiQueryKeys } from "@/services/api/query-keys";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import React, { useCallback } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ImageUploadFlowModal } from "@/features/virtual-creativity/components/image-upload-flow-modal";
import { useImageUploadFlow } from "@/features/virtual-creativity/hooks/use-image-upload-flow";

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 2;
const GAP = 10;
const ITEM_WIDTH = (width - 50) / 2;
const ITEM_HEIGHT = ITEM_WIDTH + 60;

export default function MyUploadsScreen() {
  const { theme, isDark } = useTheme();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: apiQueryKeys.assets.localUploads,
    queryFn: fetchLocalUploadTabAssets,
  });

  const uploads = data?.flatAssets ?? [];

  const { startUploadFlow, isPickingImage, modalProps } = useImageUploadFlow({
    title: "Upload Image",
    description: "Remove background and save to your collection.",
    doneLabel: "Save",
    onComplete: async ({ finalUri }) => {
      await persistLocalUploadAsset(finalUri);
      void queryClient.invalidateQueries({
        queryKey: apiQueryKeys.assets.localUploads,
      });
    },
  });

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert(
        "Delete Image",
        "Are you sure you want to remove this image from your uploads?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              await deleteLocalUploadAsset(id);
              void queryClient.invalidateQueries({
                queryKey: apiQueryKeys.assets.localUploads,
              });
            },
          },
        ],
      );
    },
    [queryClient],
  );

  const renderItem = useCallback(
    ({ item }: { item: (typeof uploads)[0] }) => (
      <View style={styles.itemContainer}>
        <View
          style={[
            styles.imageWrapper,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.05)",
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            },
          ]}
        >
          <Image
            source={{ uri: item.image }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </View>
        <Pressable
          style={[styles.deleteBtn, { backgroundColor: "#FF3B30" }]}
          onPress={() => handleDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={14} color="white" />
        </Pressable>
      </View>
    ),
    [handleDelete, isDark],
  );

  return (
    <View style={styles.container}>
      <Header title="My Uploads" />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.textPrimary} />
        </View>
      ) : uploads.length === 0 ? (
        <View style={{ flex: 1 }}>
          <EmptyState
            title="No Uploads Yet"
            description="Images you upload and process for AR will appear here."
          />
          <View style={styles.emptyAction}>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: "#000" }]}
              onPress={() => void startUploadFlow()}
              disabled={isPickingImage}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={20}
                color="white"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.primaryBtnText}>Upload New</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <FlatList
          data={uploads}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}

      {uploads.length > 0 && (
        <View style={styles.fabContainer}>
          <Pressable
            style={[styles.fab, { backgroundColor: "#000" }]}
            onPress={() => void startUploadFlow()}
            disabled={isPickingImage}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={20}
              color="white"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.fabText}>Upload New</Text>
          </Pressable>
        </View>
      )}

      <ImageUploadFlowModal {...modalProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: 20,
    paddingBottom: 120,
  },
  columnWrapper: {
    gap: GAP,
    marginBottom: GAP,
  },
  itemContainer: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    position: "relative",
    marginBottom: 10,
  },
  imageWrapper: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: "0px 2px 8px 0px rgba(0, 0, 0, 0.12)",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  deleteBtn: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    boxShadow: "0px 2px 6px 0px rgba(0, 0, 0, 0.25)",
  },
  emptyAction: {
    paddingHorizontal: 40,
    marginTop: -40,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: FontFamily.semibold,
  },
  fabContainer: {
    position: "absolute",
    right: 24,
    bottom: 40,
  },
  fab: {
    height: 54,
    borderRadius: 27,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    boxShadow: "0px 4px 12px 0px rgba(0, 0, 0, 0.28)",
  },
  fabText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: FontFamily.semibold,
  },
});
