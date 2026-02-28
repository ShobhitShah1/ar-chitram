import { useStoryFrameSize } from "@/hooks/use-story-frame-size";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

type StoryImageSource = React.ComponentProps<typeof Image>["source"];

interface StoryFramePreviewCardProps {
  source: StoryImageSource;
  cardBackgroundColor: string;
  maxWidthRatio?: number;
  maxHeightRatio?: number;
  style?: ViewStyle;
}

export const StoryFramePreviewCard: React.FC<StoryFramePreviewCardProps> = ({
  source,
  cardBackgroundColor,
  maxWidthRatio = 0.85,
  maxHeightRatio = 0.68,
  style,
}) => {
  const cardFrame = useStoryFrameSize({
    maxWidthRatio,
    maxHeightRatio,
  });

  return (
    <View
      style={[
        styles.card,
        style,
        {
          backgroundColor: cardBackgroundColor,
          width: cardFrame.width,
          height: cardFrame.height,
        },
      ]}
    >
      <Image source={source} style={styles.image} contentFit="contain" />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
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
});
