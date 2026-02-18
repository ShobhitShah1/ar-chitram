import { VirtualLayer } from "@/store/virtual-creativity-store";
import { Image } from "expo-image";
import React from "react";
import { ScrollView, StyleSheet, View, Pressable } from "react-native";
import Svg, { Path } from "react-native-svg";

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

  const orderedLayers = [...layers].sort((a, b) => {
    const aIndex = Number(a.id.split("-")[1]) || 0;
    const bIndex = Number(b.id.split("-")[1]) || 0;
    return aIndex - bIndex;
  });
  const strokeScale = 0.12;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {orderedLayers.map((layer, index) => (
          <Pressable
            key={layer.id}
            onPress={() => onSelectLayer(layer.id)}
            style={[
              styles.thumbnailWrapper,
              // Negative margin to overlap items
              index > 0 && { marginLeft: -15 },
              // ZIndex to ensure first items are on top of later items
              { zIndex: orderedLayers.length - index },
              layer.id === selectedLayerId && styles.selectedWrapper,
            ]}
          >
            <View style={styles.thumbnail}>
              {layer.uri ? (
                <>
                  <Image
                    source={{ uri: layer.uri }}
                    style={styles.image}
                    contentFit="contain"
                    tintColor={layer.color}
                  />
                  <Svg
                    style={StyleSheet.absoluteFill}
                    viewBox={`0 0 ${layer.width || 1080} ${layer.height || 1920}`}
                  >
                    {layer.paths?.map((path) => (
                      <Path
                        key={path.id}
                        d={path.path}
                        stroke={path.color}
                        strokeWidth={Math.max(1, path.strokeWidth * strokeScale)}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                  </Svg>
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
    paddingHorizontal: 24,
    alignItems: "center",
  },
  thumbnailWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
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
