import { ic_pro_icon } from "@/assets/icons";
import { EmptyState } from "@/components/empty-state";
import { PremiumAssetModal } from "@/components/premium-asset-modal";
import { StoryRow } from "@/components/story/story-row";
import TabsHeader from "@/components/tabs-header";
import { WinnerModal } from "@/components/winner-modal";
import { View as ThemedView } from "@/components/themed";
import { useTheme } from "@/context/theme-context";
import { ImageUploadFlowModal } from "@/features/virtual-creativity/components/image-upload-flow-modal";
import { useImageUploadFlow } from "@/features/virtual-creativity/hooks/use-image-upload-flow";
import {
  fetchLocalUploadTabAssets,
  persistLocalUploadAsset,
} from "@/features/virtual-creativity/services/local-upload-asset-service";
import { useHomeTabAssets } from "@/hooks/api";
import { usePremiumAssetGuideFlow } from "@/hooks/use-premium-asset-guide-flow";
import {
  HomeWinnerItem,
  TabAssetItem,
} from "@/services/api/tab-assets-service";
import { apiQueryKeys } from "@/services/api/query-keys";
import { useVirtualCreativityStore } from "@/features/virtual-creativity/store/virtual-creativity-store";
import { useQueryClient } from "@tanstack/react-query";
import { useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import React, { memo, useCallback, useState } from "react";
import {
  Dimensions,
  FlatList,
  InteractionManager,
  Platform,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated from "react-native-reanimated";

const WINNER_CARD_WIDTH = 176;
const WINNER_CARD_HEIGHT = 224;
const GRID_GAP = 12;
const GRID_PADDING = 16;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;
const GRID_FULL_WIDTH = SCREEN_WIDTH - GRID_PADDING * 2;

interface HomeWinnerCardProps {
  winner: HomeWinnerItem;
  onPress: (winner: HomeWinnerItem) => void;
}

const HomeWinnerCard = memo(({ winner, onPress }: HomeWinnerCardProps) => {
  const { theme, isDark } = useTheme();

  return (
    <Pressable
      onPress={() => onPress(winner)}
      style={[
        styles.winnerCard,
        {
          backgroundColor: theme.cardBackground,
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
        },
      ]}
    >
      <Image
        source={{ uri: winner.image }}
        style={styles.winnerImage}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <View style={styles.winnerGradient} />
      <View style={styles.winnerCardFooter}>
        <View style={styles.winnerIdentityRow}>
          {winner.profileImage ? (
            <Image
              source={{ uri: winner.profileImage }}
              style={styles.winnerAvatar}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.winnerAvatarFallback} />
          )}
          <View style={styles.winnerTextWrap}>
            <Text numberOfLines={1} style={styles.winnerName}>
              {winner.username || "Winner"}
            </Text>
            <Text numberOfLines={1} style={styles.winnerMeta}>
              {winner.like_count
                ? `${winner.like_count} likes`
                : "Contest Winner"}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

interface HomeWinnerSectionProps {
  title: string;
  winners: HomeWinnerItem[];
  onPress: (winner: HomeWinnerItem) => void;
}

const HomeWinnerSection = memo(
  ({ title, winners, onPress }: HomeWinnerSectionProps) => {
    const { theme } = useTheme();

    const renderItem = useCallback(
      ({ item }: { item: HomeWinnerItem }) => (
        <HomeWinnerCard winner={item} onPress={onPress} />
      ),
      [onPress],
    );

    return (
      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          {title}
        </Text>
        <FlatList
          horizontal
          data={winners}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.winnerListContent}
          ItemSeparatorComponent={() => <View style={styles.inlineSpacer} />}
        />
      </View>
    );
  },
);

interface HomeAssetGridProps {
  items: TabAssetItem[];
  onPress: (item: TabAssetItem) => void;
}

const HomeAssetGrid = memo(({ items, onPress }: HomeAssetGridProps) => {
  const { theme } = useTheme();

  return (
    <View style={styles.assetGridWrap}>
      <View style={styles.assetGrid}>
        {items.map((item, index) => {
          const isFullWidth = index % 3 === 2;
          const cardStyle = isFullWidth
            ? styles.assetCardSingle
            : styles.assetCardPair;
          const imageStyle = isFullWidth
            ? styles.assetImageSingle
            : styles.assetImagePair;

          console.log(item.image);

          return (
            <View
              key={item.id}
              style={{ width: isFullWidth ? GRID_FULL_WIDTH : GRID_CARD_WIDTH }}
            >
              <Pressable
                onPress={() => onPress(item)}
                style={[
                  cardStyle,
                  {
                    backgroundColor: theme.drawingCardBackground,
                    boxShadow: theme.drawingCardShadow,
                  } as any,
                ]}
              >
                <Image
                  source={{ uri: item.image }}
                  style={imageStyle}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  transition={200}
                />
                {item.isPremium ? (
                  <View pointerEvents="none" style={styles.premiumBadgeWrap}>
                    <Image
                      source={ic_pro_icon}
                      style={styles.premiumBadge}
                      contentFit="contain"
                      transition={0}
                    />
                  </View>
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
});

export default function Home() {
  const { theme } = useTheme();
  const clearPendingUploadUris = useVirtualCreativityStore(
    (state) => state.clearPendingUploadUris,
  );
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useHomeTabAssets();
  const homeGridItems = data?.homeGridItems ?? [];
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedWinner, setSelectedWinner] = useState<HomeWinnerItem | null>(
    null,
  );
  const hasAutoRequestedPermission = React.useRef(false);
  const {
    selectedPremiumAsset,
    premiumPriceLabel,
    isFreePremiumActionBusy,
    isPremiumActionBusy,
    handleAssetPress,
    handleClosePremiumAsset,
    handleFreePremiumAsset,
    handlePremiumAsset,
  } = usePremiumAssetGuideFlow({
    preloadItems: homeGridItems,
  });
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
  const todayWinners = data?.todayWinners ?? [];
  const last7DaysWinners = data?.last7DaysWinners ?? [];

  const hasHomeContent =
    contestStoryData.length > 0 ||
    todayWinners.length > 0 ||
    last7DaysWinners.length > 0 ||
    homeGridItems.length > 0;
  const isInitialLoading = isLoading && !hasHomeContent;
  const showErrorState = isError && !hasHomeContent;

  const handleUploadPress = React.useCallback(() => {
    void startUploadFlow();
  }, [startUploadFlow]);

  const handleWinnerPress = useCallback((winner: HomeWinnerItem) => {
    setSelectedWinner(winner);
  }, []);

  const handleCloseWinnerModal = useCallback(() => {
    setSelectedWinner(null);
  }, []);

  return (
    <ThemedView
      style={{ paddingTop: (StatusBar.currentHeight ?? 0) + 10, flex: 1 }}
    >
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
          ) : (
            <>
              {contestStoryData.length > 0 ? (
                <View style={styles.storiesSection}>
                  <StoryRow
                    stories={contestStoryData}
                    contestStoryData={contestStoryData}
                  />
                </View>
              ) : null}

              {todayWinners.length > 0 ? (
                <HomeWinnerSection
                  title="Today's Winners"
                  winners={todayWinners}
                  onPress={handleWinnerPress}
                />
              ) : null}

              {last7DaysWinners.length > 0 ? (
                <HomeWinnerSection
                  title="Last 7 Days"
                  winners={last7DaysWinners}
                  onPress={handleWinnerPress}
                />
              ) : null}

              {homeGridItems.length > 0 ? (
                <View style={styles.sectionBlock}>
                  <HomeAssetGrid
                    items={homeGridItems}
                    onPress={handleAssetPress}
                  />
                </View>
              ) : null}

              {!hasHomeContent ? (
                <EmptyState
                  title="No home content"
                  description="New winners and home images will appear here."
                  containerStyle={{ minHeight: 240 }}
                />
              ) : null}
            </>
          )}
        </Animated.ScrollView>
      </KeyboardAvoidingView>

      <PremiumAssetModal
        asset={selectedPremiumAsset}
        visible={!!selectedPremiumAsset}
        onClose={handleClosePremiumAsset}
        onFreePress={handleFreePremiumAsset}
        onPremiumPress={handlePremiumAsset}
        freeDisabled={isFreePremiumActionBusy}
        premiumDisabled={isPremiumActionBusy}
        premiumPriceLabel={premiumPriceLabel}
      />

      <WinnerModal
        visible={!!selectedWinner}
        onClose={handleCloseWinnerModal}
        userImage={selectedWinner?.profileImage}
        backgroundImage={selectedWinner?.image}
      />

      <ImageUploadFlowModal {...modalProps} />
    </ThemedView>
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
    paddingBottom: 6,
  },
  sectionBlock: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  inlineSpacer: {
    width: 12,
  },
  winnerListContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  winnerCard: {
    width: WINNER_CARD_WIDTH,
    height: WINNER_CARD_HEIGHT,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
  },
  winnerImage: {
    width: "100%",
    height: "100%",
  },
  winnerGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.22)",
  },
  winnerCardFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  winnerIdentityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  winnerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
  },
  winnerAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  winnerTextWrap: {
    flex: 1,
  },
  winnerName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  winnerMeta: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 2,
  },
  assetGridWrap: {
    paddingHorizontal: GRID_PADDING,
  },
  assetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  assetCardPair: {
    height: GRID_CARD_WIDTH,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  assetCardSingle: {
    height: GRID_CARD_WIDTH * 0.85,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  assetImagePair: {
    width: "100%",
    height: "100%",
  },
  assetImageSingle: {
    width: "80%",
    height: "80%",
  },
  premiumBadgeWrap: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  premiumBadge: {
    width: "100%",
    height: "100%",
  },
});
