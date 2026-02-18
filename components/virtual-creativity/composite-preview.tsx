import React from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Svg, { Path } from "react-native-svg";
import { VirtualLayer } from "@/store/virtual-creativity-store";

interface CompositePreviewProps {
  layers: VirtualLayer[];
  width?: number;
  height?: number;
  showDrawings?: boolean;
}

export const CompositePreview: React.FC<CompositePreviewProps> = ({
  layers,
  width = 1080,
  height = 1920,
  showDrawings = false,
}) => {
  // Render layers in order (zIndex is already handled by array order usually, or we sort)
  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <View style={styles.container}>
      {sortedLayers.map((layer, index) => (
        <View key={`${layer.id}-${index}`} style={StyleSheet.absoluteFill}>
          {/* Layer Image */}
          {layer.uri && (
            <Image
              source={{ uri: layer.uri }}
              style={styles.image}
              contentFit="contain"
            />
          )}

          {showDrawings ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { zIndex: 10, backgroundColor: "transparent" },
              ]}
            >
              <Svg
                style={StyleSheet.absoluteFill}
                viewBox={`0 0 ${layer.width || width} ${layer.height || height}`}
              >
                {layer.paths?.map((p) => (
                  <Path
                    key={p.id}
                    d={p.path}
                    stroke={p.color}
                    strokeWidth={Math.max(1, p.strokeWidth * 0.12)}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </Svg>
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
    backgroundColor: "#fff", // Main background
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
