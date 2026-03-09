import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";

import { DrawingLayerSvg } from "@/components/virtual-creativity/drawing-layer-svg";
import { VirtualLayer } from "@/store/virtual-creativity-store";

interface LayerStripProps {
  layers: VirtualLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  horizontalInset?: number;
}

export const LayerStrip: React.FC<LayerStripProps> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  horizontalInset = 16,
}) => {
  if (!layers || layers.length === 0) {
    return null;
  }

  const orderedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalInset },
        ]}
      >
        {orderedLayers.map((layer, index) => (
          <Pressable
            key={layer.id}
            onPress={() => onSelectLayer(layer.id)}
            style={[
              styles.thumbnailWrapper,
              index > 0 && { marginLeft: -15 },
              { zIndex: orderedLayers.length - index },
              selectedLayerId && layer.id === selectedLayerId
                ? styles.selectedWrapper
                : null,
            ]}
          >
            <View style={styles.thumbnail}>
              {layer.uri ? (
                <>
                  <Image
                    source={{ uri: layer.uri }}
                    style={styles.image}
                    contentFit="contain"
                  />
                  <DrawingLayerSvg
                    idPrefix={`strip-${layer.id}`}
                    paths={layer.paths || []}
                    layerWidth={layer.width}
                    layerHeight={layer.height}
                    strokeScale={0.12}
                    minimumStrokeWidth={1}
                  />
                </>
              ) : (
                <View
                  style={[
                    styles.colorPlaceholder,
                    { backgroundColor: layer.color || "#ccc" },
                  ]}
                />
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  scrollContent: {
    alignItems: "center",
  },
  thumbnailWrapper: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: "transparent",
  },
  selectedWrapper: {
    borderColor: "#000",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  colorPlaceholder: {
    flex: 1,
  },
});
