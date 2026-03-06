import { VirtualLayer } from "@/store/virtual-creativity-store";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utiles/story-frame";
import { Image } from "expo-image";
import React from "react";
import { ScrollView, StyleSheet, View, Pressable } from "react-native";
import Svg, { Path } from "react-native-svg";

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
  const strokeScale = 0.12;

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
                  <Svg
                    style={StyleSheet.absoluteFill}
                    viewBox={`0 0 ${layer.width || STORY_FRAME_WIDTH} ${layer.height || STORY_FRAME_HEIGHT}`}
                  >
                    {layer.paths?.map((path) => (
                      <Path
                        key={path.id}
                        d={path.path}
                        stroke={path.color}
                        strokeWidth={Math.max(
                          1,
                          path.strokeWidth * strokeScale,
                        )}
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
