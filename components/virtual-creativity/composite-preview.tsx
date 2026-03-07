import React from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Svg, { Defs, Image as SvgImage, Path, Pattern } from "react-native-svg";
import { VirtualLayer } from "@/store/virtual-creativity-store";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utiles/story-frame";

const PATTERN_TILE_SIZE = 60;

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
      {sortedLayers.map((layer, index) => {
        const patternUris = Array.from(
          new Set(
            (layer.paths || [])
              .filter((path) => path.brushKind === "pattern" && path.patternUri)
              .map((path) => path.patternUri as string),
          ),
        );

        return (
          <View key={`${layer.id}-${index}`} style={StyleSheet.absoluteFill}>
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
                  {patternUris.length > 0 ? (
                    <Defs>
                      {patternUris.map((uri, patternIndex) => (
                        <Pattern
                          key={`pp${patternIndex}`}
                          id={`pp${patternIndex}`}
                          patternUnits="userSpaceOnUse"
                          width={PATTERN_TILE_SIZE}
                          height={PATTERN_TILE_SIZE}
                        >
                          <SvgImage
                            href={{ uri }}
                            x={0}
                            y={0}
                            width={PATTERN_TILE_SIZE}
                            height={PATTERN_TILE_SIZE}
                            preserveAspectRatio="xMidYMid slice"
                          />
                        </Pattern>
                      ))}
                    </Defs>
                  ) : null}
                  {layer.paths?.map((path) => {
                    const isPattern =
                      path.brushKind === "pattern" && path.patternUri;
                    const patternIndex = isPattern
                      ? patternUris.indexOf(path.patternUri!)
                      : -1;

                    if (isPattern && patternIndex >= 0) {
                      return (
                        <React.Fragment key={path.id}>
                          <Path
                            d={path.path}
                            stroke={path.color || "#888"}
                            strokeWidth={Math.max(1, path.strokeWidth * 0.12)}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={0.35}
                          />
                          <Path
                            d={path.path}
                            stroke={`url(#pp${patternIndex})`}
                            strokeWidth={Math.max(1, path.strokeWidth * 0.12)}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </React.Fragment>
                      );
                    }

                    return (
                      <Path
                        key={path.id}
                        d={path.path}
                        stroke={path.color}
                        strokeWidth={Math.max(1, path.strokeWidth * 0.12)}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  })}
                </Svg>
              </View>
            ) : null}
          </View>
        );
      })}
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
