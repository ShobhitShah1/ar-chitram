import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { DrawingLayerSvg } from "@/features/virtual-creativity/components/drawing-layer-svg";
import { VirtualLayerVisual } from "@/features/virtual-creativity/components/layer-visual";
import { VirtualLayer } from "@/features/virtual-creativity/store/virtual-creativity-store";

interface LayerStripProps {
  layers: VirtualLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  horizontalInset?: number;
  reserveSpace?: boolean;
}

export const LayerStrip: React.FC<LayerStripProps> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  horizontalInset = 16,
  reserveSpace = false,
}) => {
  if ((!layers || layers.length === 0) && !reserveSpace) {
    return null;
  }

  const orderedLayers = [...layers].sort(
    (a, b) => (a.stripOrder ?? a.zIndex) - (b.stripOrder ?? b.zIndex),
  );

  return (
    <View style={styles.container}>
      {orderedLayers.length > 0 ? (
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
                {layer.uri || layer.type === "text" ? (
                  <>
                    <VirtualLayerVisual layer={layer} />
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
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 40,
    justifyContent: "center",
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
  colorPlaceholder: {
    flex: 1,
  },
});
