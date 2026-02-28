import { Image } from "expo-image";
import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
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
}

interface ImageGridProps {
  data: GridAssetItem[];
  onPress: (item: GridAssetItem) => void;
  ListHeaderComponent?: React.ReactNode;
  contentContainerStyle?: any;
}

const GAP = 12;
const PADDING = 16;
const CARD_WIDTH = (width - PADDING * 2 - GAP) / 2;
const FULL_WIDTH = width - PADDING * 2;

const ImageGrid: React.FC<ImageGridProps> = ({
  data,
  onPress,
  ListHeaderComponent,
  contentContainerStyle,
}) => {
  const { theme } = useTheme();

  return (
    <Animated.ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.container, contentContainerStyle]}
    >
      {ListHeaderComponent}

      <View style={styles.grid}>
        {data.map((item, index) => {
          // Pattern: 2 items (Half), 1 item (Full)
          // Index % 3 === 2 -> Full, else Half
          const isFullWidth = index % 3 === 2;

          const itemWidth = isFullWidth ? FULL_WIDTH : CARD_WIDTH;
          const isSingle = isFullWidth; // For image styling logic

          const cardStyle = isSingle ? styles.cardSingle : styles.cardPair;
          const imageStyle = isSingle ? styles.imageSingle : styles.imagePair;

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
                    backgroundColor: item.color || theme.drawingCardBackground,
                    boxShadow: theme.drawingCardShadow,
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
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },
  cardPair: {
    height: CARD_WIDTH,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  cardSingle: {
    height: CARD_WIDTH * 0.85,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  imagePair: {
    width: "100%",
    height: "100%",
  },
  imageSingle: {
    width: "80%",
    height: "80%",
  },
});
