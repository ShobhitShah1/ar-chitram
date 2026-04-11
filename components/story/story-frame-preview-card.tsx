import { useStoryFrameSize } from "@/hooks/use-story-frame-size";
import { Image } from "expo-image";
import React, { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

type StoryImageSource = React.ComponentProps<typeof Image>["source"];

interface StoryFramePreviewCardProps {
  source: StoryImageSource;
  cardBackgroundColor: string;
  maxWidthRatio?: number;
  maxHeightRatio?: number;
  style?: ViewStyle;
  children?: ReactNode;
}

export const StoryFramePreviewCard: React.FC<StoryFramePreviewCardProps> = ({
  source,
  cardBackgroundColor,
  maxWidthRatio = 0.85,
  maxHeightRatio = 0.68,
  style,
  children,
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
      <View style={styles.imageLayer} pointerEvents="none">
        <Image source={source} style={styles.image} contentFit="contain" />
      </View>
      {children ? <View style={styles.overlay}>{children}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    boxShadow: "0px 0px 20px 0px rgba(0,0,0,0.05)",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "flex-end",
    padding: 12,
    zIndex: 2,
    elevation: 2,
  },
});
