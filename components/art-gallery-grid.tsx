import { Image } from "expo-image";
import React from "react";
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";

import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { ArtCaptureGroup } from "@/features/gallery/services/local-gallery-service";

const { width } = Dimensions.get("window");

const GAP = 12;
const PADDING = 16;
const CARD_WIDTH = (width - PADDING * 2 - GAP) / 2;
const IMAGE_SIZE = CARD_WIDTH - 24;
const STAGE_HEIGHT = IMAGE_SIZE + 30;

const BACK_CONFIGS = [
  { rotate: "-12deg", translateX: -8, opacity: 0.55, scale: 0.84 },
  { rotate: "10deg", translateX: 6, opacity: 0.72, scale: 0.9 },
];

interface ArtGalleryGridProps {
  data: ArtCaptureGroup[];
  onPress: (group: ArtCaptureGroup) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  ListEmptyComponent?: React.ReactNode;
}

export const ArtGalleryGrid: React.FC<ArtGalleryGridProps> = ({
  data,
  onPress,
  refreshing = false,
  onRefresh,
  ListEmptyComponent,
}) => {
  const { theme, isDark } = useTheme();
  const isEmpty = data.length === 0;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.container,
        isEmpty ? styles.emptyContainer : null,
      ]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#000000"]}
            tintColor="#000000"
          />
        ) : undefined
      }
    >
      {isEmpty ? (
        (ListEmptyComponent ?? null)
      ) : (
        <View style={styles.grid}>
          {data.map((group) => {
            const isFolder = group.captures.length > 1;
            const previewCaptures = [...group.captures]
              .sort((a, b) => b.createdAt - a.createdAt)
              .slice(0, 3);

            const backCaptures = previewCaptures.slice(1);
            const frontCapture = previewCaptures[0];

            const cardBorder = {
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.06)",
            };

            return (
              <Pressable
                key={group.id}
                onPress={() => onPress(group)}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.drawingCardBackground,
                    ...cardBorder,
                    ...(theme.drawingCardShadow
                      ? { boxShadow: theme.drawingCardShadow }
                      : {}),
                  },
                ]}
              >
                <View
                  style={[
                    styles.stage,
                    { height: isFolder ? STAGE_HEIGHT : IMAGE_SIZE },
                  ]}
                >
                  {backCaptures.map((capture, i) => {
                    const cfg = BACK_CONFIGS[i] ?? BACK_CONFIGS[0];
                    return (
                      <View
                        key={capture.id}
                        style={[
                          styles.backCard,
                          {
                            width: IMAGE_SIZE * cfg.scale,
                            height: IMAGE_SIZE * cfg.scale,
                            opacity: cfg.opacity,
                            zIndex: i + 1,
                            transform: [
                              { translateX: cfg.translateX },
                              { rotate: cfg.rotate },
                            ],
                            backgroundColor: theme.drawingCardBackground,
                            ...cardBorder,
                          },
                        ]}
                      >
                        <Image
                          source={{ uri: capture.uri }}
                          contentFit="cover"
                          style={styles.image}
                          cachePolicy="memory-disk"
                        />
                      </View>
                    );
                  })}

                  <View
                    style={[
                      styles.frontCard,
                      isFolder
                        ? styles.frontCardFolder
                        : styles.frontCardSingle,
                      {
                        width: IMAGE_SIZE,
                        height: IMAGE_SIZE,
                        backgroundColor: theme.drawingCardBackground,
                        ...cardBorder,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: frontCapture.uri }}
                      contentFit="cover"
                      style={styles.image}
                      cachePolicy="memory-disk"
                    />

                    {isFolder ? (
                      <View style={styles.countPill}>
                        <View style={styles.countDot} />
                        <Text style={styles.countText}>
                          {Math.max(0, group.captures.length - 1)} snapshots
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 5,
    paddingHorizontal: PADDING,
    paddingBottom: 130,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 24,
    padding: 12,
    paddingTop: 16,
    borderWidth: 1,
    overflow: "visible",
  },
  stage: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  backCard: {
    position: "absolute",
    top: 0,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  frontCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  frontCardSingle: {},
  frontCardFolder: {
    position: "absolute",
    bottom: 0,
    zIndex: 10,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  countPill: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(10,10,10,0.62)",
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  countDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  countText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: FontFamily.semibold,
  },
});
