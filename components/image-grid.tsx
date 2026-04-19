import { ic_pro_icon } from "@/assets/icons";
import { Image } from "expo-image";
import React, { useMemo } from "react";
import {
  Dimensions,
  RefreshControl,
  StyleSheet,
  View,
  Text,
  FlatList,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { useVideoPlayer, VideoView } from "expo-video";

import { Pressable } from "./themed";
import { useTheme } from "@/context/theme-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { FontFamily } from "@/constants/fonts";

const { width } = Dimensions.get("window");

export interface GridAssetItem {
  id: string | number;
  image?: string | number | { uri: string };
  uri?: string;
  mediaType?: "photo" | "video" | "audio" | "unknown";
  color?: string;
  isPremium?: boolean;
  sku?: string | null;
  source?: string;
  placeholder?: string;
}

import * as VideoThumbnails from "expo-video-thumbnails";

const VideoThumbnail = React.memo(
  ({ uri, imageStyle }: { uri: string; imageStyle: any }) => {
    const [thumbnail, setThumbnail] = React.useState<string | null>(null);

    React.useEffect(() => {
      let isMounted = true;
      const generateThumbnail = async () => {
        try {
          const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(
            uri,
            {
              time: 0,
            },
          );
          if (isMounted) {
            setThumbnail(thumbUri);
          }
        } catch (e) {
          // Fallback or ignore
        }
      };

      generateThumbnail();
      return () => {
        isMounted = false;
      };
    }, [uri]);

    return (
      <Image
        source={thumbnail ? { uri: thumbnail } : undefined}
        contentFit="cover"
        style={imageStyle}
        transition={200}
      />
    );
  },
);

const VideoPoster = React.memo(() => {
  return (
    <View style={styles.videoPoster}>
      <View style={styles.videoPosterBadge}>
        <Ionicons name="videocam" size={14} color="#FFFFFF" />
      </View>
    </View>
  );
});

interface ImageGridProps {
  data: GridAssetItem[];
  onPress: (item: GridAssetItem) => void;
  isUnlocked?: (item: GridAssetItem) => boolean;
  ListHeaderComponent?: React.ReactNode;
  ListEmptyComponent?: React.ReactNode;
  contentContainerStyle?: any;
  refreshing?: boolean;
  onRefresh?: () => void;
  numColumns?: 2 | 3;
  useStaticVideoPoster?: boolean;
  ListFooterComponent?: React.ReactNode;
}

const GAP = 12;
const PADDING = 16;
const CARD_WIDTH = Math.floor((width - PADDING * 2 - GAP) / 2);
const THIRD_WIDTH = Math.floor((width - PADDING * 2 - GAP * 2) / 3);

const ImageGridItem = React.memo(
  ({
    item,
    onPress,
    isUnlocked,
    theme,
    isDark,
    itemWidth,
    cardStyle,
    imageStyle,
  }: {
    item: GridAssetItem;
    onPress: (item: GridAssetItem) => void;
    isUnlocked?: (item: GridAssetItem) => boolean;
    theme: any;
    isDark: boolean;
    itemWidth: number;
    cardStyle: any;
    imageStyle: any;
  }) => {
    return (
      <Animated.View
        layout={LinearTransition.springify().mass(1).damping(20).stiffness(100)}
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={{ width: itemWidth }}
      >
        <Pressable
          style={[
            cardStyle,
            {
              width: "100%",
              backgroundColor: item.color || theme.drawingCardBackground,
              ...(!isDark ? { boxShadow: theme.drawingCardShadow } : {}),
            } as any,
          ]}
          onPress={() => onPress(item)}
        >
          {item.image ? (
            <View style={{ width: "100%", height: "100%" }}>
              {item.mediaType === "video" && typeof item.image === "string" ? (
                <VideoThumbnail uri={item.image} imageStyle={imageStyle} />
              ) : (
                <Image
                  source={
                    typeof item.image === "string"
                      ? { uri: item.image }
                      : item.image
                  }
                  placeholder={item.placeholder}
                  contentFit="contain"
                  style={imageStyle}
                  transition={100}
                  priority="high"
                  cachePolicy="memory-disk"
                  recyclingKey={
                    typeof item.image === "string"
                      ? item.image
                      : String(item.id)
                  }
                />
              )}
              {item.mediaType === "video" && <VideoPoster />}
            </View>
          ) : null}

          {item.isPremium && !isUnlocked?.(item) ? (
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

        {item.source ? (
          <View pointerEvents="none" style={styles.sourceTagWrap}>
            <Text style={styles.sourceTagText}>{item.source}</Text>
          </View>
        ) : null}
      </Animated.View>
    );
  },
);

type GridRow = {
  id: string;
  items: GridAssetItem[];
  type: "pair" | "third";
};

const ImageGrid: React.FC<ImageGridProps> = ({
  data,
  onPress,
  isUnlocked,
  ListHeaderComponent,
  ListEmptyComponent,
  contentContainerStyle,
  refreshing = false,
  onRefresh,
  numColumns = 3,
  ListFooterComponent,
}) => {
  const { theme, isDark } = useTheme();

  const rows = useMemo(() => {
    const result: GridRow[] = [];
    if (numColumns === 2) {
      for (let i = 0; i < data.length; i += 2) {
        result.push({
          id: `row-${i}`,
          items: data.slice(i, i + 2),
          type: "pair",
        });
      }
    } else {
      let i = 0;
      while (i < data.length) {
        // Pattern: [2 items], [3 items]
        const isPairRow = result.length % 2 === 0;
        if (isPairRow) {
          result.push({
            id: `row-${i}`,
            items: data.slice(i, i + 2),
            type: "pair",
          });
          i += 2;
        } else {
          result.push({
            id: `row-${i}`,
            items: data.slice(i, i + 3),
            type: "third",
          });
          i += 3;
        }
      }
    }
    return result;
  }, [data, numColumns]);

  const renderRow = ({ item: row }: { item: GridRow }) => {
    return (
      <View style={styles.row}>
        {row.items.map((item) => (
          <ImageGridItem
            key={String(item.id)}
            item={item}
            onPress={onPress}
            isUnlocked={isUnlocked}
            theme={theme}
            isDark={isDark}
            itemWidth={row.type === "pair" ? CARD_WIDTH : THIRD_WIDTH}
            cardStyle={row.type === "pair" ? styles.cardPair : styles.cardThird}
            imageStyle={
              row.type === "pair" ? styles.imagePair : styles.imageThird
            }
          />
        ))}
      </View>
    );
  };

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.id}
      renderItem={renderRow}
      ListHeaderComponent={<>{ListHeaderComponent}</>}
      ListEmptyComponent={<>{ListEmptyComponent}</>}
      ListFooterComponent={<>{ListFooterComponent}</>}
      contentContainerStyle={[
        styles.container,
        data.length === 0 ? styles.emptyContainer : null,
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
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
      removeClippedSubviews={true} // Performance optimization for large lists
      initialNumToRender={5}
      maxToRenderPerBatch={5}
      windowSize={5}
    />
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
  row: {
    flexDirection: "row",
    gap: GAP,
    marginBottom: GAP,
  },
  cardPair: {
    height: CARD_WIDTH,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    overflow: "hidden",
  },
  cardThird: {
    height: THIRD_WIDTH + 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
    overflow: "hidden",
  },
  imagePair: {
    width: "100%",
    height: "100%",
  },
  imageThird: {
    width: "100%",
    height: "100%",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  videoPoster: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    zIndex: 10,
  },
  videoPosterBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
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
  sourceTagWrap: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sourceTagText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: FontFamily.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
