import { ic_pro_icon } from "@/assets/icons";
import { Image } from "expo-image";
import React from "react";
import { Dimensions, RefreshControl, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

import { Pressable } from "./themed";
import { useTheme } from "@/context/theme-context";

const { width } = Dimensions.get("window");

export interface GridAssetItem {
  id: string | number;
  image?: string | number | { uri: string };
  color?: string;
  isPremium?: boolean;
  sku?: string | null;
}

interface ImageGridProps {
  data: GridAssetItem[];
  onPress: (item: GridAssetItem) => void;
  ListHeaderComponent?: React.ReactNode;
  ListEmptyComponent?: React.ReactNode;
  contentContainerStyle?: any;
  refreshing?: boolean;
  onRefresh?: () => void;
  numColumns?: 2 | 3; // 3 for staggered, 2 for uniform
}

const GAP = 12;
const PADDING = 16;
const CARD_WIDTH = Math.floor((width - PADDING * 2 - GAP) / 2);
const THIRD_WIDTH = Math.floor((width - PADDING * 2 - GAP * 2) / 3);
const FULL_WIDTH = width - PADDING * 2;

const ImageGrid: React.FC<ImageGridProps> = ({
  data,
  onPress,
  ListHeaderComponent,
  ListEmptyComponent,
  contentContainerStyle,
  refreshing = false,
  onRefresh,
  numColumns = 3,
}) => {
  const { theme, isDark } = useTheme();
  const isEmpty = data.length === 0;

  return (
    <Animated.ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.container,
        isEmpty ? styles.emptyContainer : null,
        contentContainerStyle,
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
      {ListHeaderComponent}

      {isEmpty ? (
        (ListEmptyComponent ?? null)
      ) : (
        <View style={styles.grid}>
          {data.map((item, index) => {
            // Pattern requested:
            // 1 1     (2 items)
            // 1 1 1   (3 items)
            let itemWidth = CARD_WIDTH;
            let cardStyle = styles.cardPair;
            let imageStyle = styles.imagePair;

            if (numColumns === 3) {
              const isThird = index % 5 >= 2;
              itemWidth = isThird ? THIRD_WIDTH : CARD_WIDTH;
              cardStyle = isThird ? styles.cardThird : styles.cardPair;
              imageStyle = isThird ? styles.imageThird : styles.imagePair;
            }

            return (
              <Animated.View
                key={String(item.id)}
                layout={LinearTransition.springify()
                  .mass(1)
                  .damping(20)
                  .stiffness(100)}
                entering={FadeIn.duration(300)}
                exiting={FadeOut.duration(200)}
                style={{ width: itemWidth }}
              >
                <Pressable
                  style={[
                    cardStyle,
                    {
                      width: "100%", // Fill wrapper
                      backgroundColor:
                        item.color || theme.drawingCardBackground,
                      ...(!isDark
                        ? { boxShadow: theme.drawingCardShadow }
                        : {}),
                    } as any,
                  ]}
                  onPress={() => onPress(item)}
                >
                  {item.image ? (
                    <Image
                      source={
                        typeof item.image === "string"
                          ? { uri: item.image }
                          : item.image
                      }
                      contentFit="contain"
                      style={imageStyle}
                      transition={200}
                    />
                  ) : item.color ? null : null}

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
              </Animated.View>
            );
          })}
        </View>
      )}
    </Animated.ScrollView>
  );
};

export default ImageGrid;

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
  cardPair: {
    height: CARD_WIDTH,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  cardThird: {
    height: THIRD_WIDTH + 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  imagePair: {
    width: "100%",
    height: "100%",
  },
  imageThird: {
    width: "100%",
    height: "100%",
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
