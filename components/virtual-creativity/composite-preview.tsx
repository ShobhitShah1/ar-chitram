import React from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";

import { DrawingLayerSvg } from "@/components/virtual-creativity/drawing-layer-svg";
import { VirtualLayer } from "@/store/virtual-creativity-store";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utiles/story-frame";

interface CompositePreviewProps {
  layers: VirtualLayer[];
  width?: number;
  height?: number;
  showDrawings?: boolean;
}

export const CompositePreview: React.FC<CompositePreviewProps> = ({
  layers,
  width = STORY_FRAME_WIDTH,
  height = STORY_FRAME_HEIGHT,
  showDrawings = false,
}) => {
  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <View style={styles.container}>
      {sortedLayers.map((layer, index) => (
        <View key={`${layer.id}-${index}`} style={StyleSheet.absoluteFill}>
          {layer.uri ? (
            <Image
              source={{ uri: layer.uri }}
              style={styles.image}
              contentFit="contain"
            />
          ) : null}

          {showDrawings ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { zIndex: 10, backgroundColor: "transparent" },
              ]}
            >
              <DrawingLayerSvg
                idPrefix={`composite-${layer.id}`}
                paths={layer.paths || []}
                layerWidth={layer.width || width}
                layerHeight={layer.height || height}
                strokeScale={0.12}
                minimumStrokeWidth={1}
              />
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
