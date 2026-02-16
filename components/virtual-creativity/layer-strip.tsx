import { VirtualLayer } from "@/store/virtual-creativity-store";
import { Image } from "expo-image";
import React from "react";
import { ScrollView, StyleSheet, View, Pressable } from "react-native";

interface LayerStripProps {
  layers: VirtualLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
}

export const LayerStrip: React.FC<LayerStripProps> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
}) => {
  if (!layers || layers.length === 0) {
    return null;
  }

  // We want the top-most layer (last in the array usually, or first if reversed) to be first.
  const reversedLayers = [...layers].reverse();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {reversedLayers.map((layer, index) => (
          <Pressable
            key={layer.id}
            onPress={() => onSelectLayer(layer.id)}
            style={[
              styles.thumbnailWrapper,
              // Negative margin to overlap items
              index > 0 && { marginLeft: -15 },
              // ZIndex to ensure first items are on top of later items
              { zIndex: reversedLayers.length - index },
              layer.id === selectedLayerId && styles.selectedWrapper,
            ]}
          >
            <View style={styles.thumbnail}>
              {layer.uri ? (
                <Image
                  source={{ uri: layer.uri }}
                  style={styles.image}
                  contentFit="cover"
                />
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
    height: 50,
    marginBottom: 0,
  },
  scrollContent: {
    paddingHorizontal: 24,
    alignItems: "center",
    paddingVertical: 5, // Small vertical padding for shadow/selection
  },
  thumbnailWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.1,
    // shadowRadius: 3,
    // elevation: 3,
  },
  selectedWrapper: {
    borderWidth: 1,
    borderColor: "#007AFF", // Blue border for selection
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
