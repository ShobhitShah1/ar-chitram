import React from "react";
import { StyleSheet, View } from "react-native";
import { DrawingLayerSvg } from "@/features/virtual-creativity/components/drawing-layer-svg";
import { VirtualLayerVisual } from "@/features/virtual-creativity/components/layer-visual";
import { getSmartFillDisplayLayout } from "@/features/virtual-creativity/services/smart-fill-layout";
import { getVirtualLayerRenderMetrics } from "@/features/virtual-creativity/services/virtual-layer-service";
import { type VirtualLayer } from "@/features/virtual-creativity/store/virtual-creativity-store";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utils/story-frame";

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
  const sortedLayers = React.useMemo(
    () => [...layers].sort((a, b) => a.zIndex - b.zIndex),
    [layers],
  );
  const [containerSize, setContainerSize] = React.useState({ width, height });

  const stageLayout = React.useMemo(
    () =>
      getSmartFillDisplayLayout(
        STORY_FRAME_WIDTH,
        STORY_FRAME_HEIGHT,
        containerSize.width,
        containerSize.height,
      ),
    [containerSize.height, containerSize.width],
  );

  return (
    <View
      style={styles.container}
      onLayout={(event) => {
        const nextWidth = Math.round(event.nativeEvent.layout.width) || width;
        const nextHeight =
          Math.round(event.nativeEvent.layout.height) || height;
        setContainerSize((current) => {
          if (current.width === nextWidth && current.height === nextHeight) {
            return current;
          }

          return {
            width: nextWidth,
            height: nextHeight,
          };
        });
      }}
    >
      <View
        style={[
          styles.stage,
          {
            left: stageLayout.offsetX,
            top: stageLayout.offsetY,
            width: stageLayout.renderedWidth,
            height: stageLayout.renderedHeight,
          },
        ]}
      >
        {sortedLayers.map((layer) => {
          const metrics = getVirtualLayerRenderMetrics(
            layer,
            stageLayout.scale,
          );
          return (
            <View
              key={layer.id}
              style={[
                styles.layer,
                {
                  left: metrics.baseLeft,
                  top: metrics.baseTop,
                  width: metrics.width,
                  height: metrics.height,
                  zIndex: layer.zIndex,
                  transform: [
                    { translateX: layer.x * stageLayout.scale },
                    { translateY: layer.y * stageLayout.scale },
                    { scale: layer.scale },
                    { rotate: `${layer.rotation}rad` },
                  ],
                },
              ]}
            >
              <VirtualLayerVisual layer={layer} />
              {showDrawings ? (
                <DrawingLayerSvg
                  idPrefix={`preview-${layer.id}`}
                  paths={layer.paths || []}
                  layerWidth={layer.width}
                  layerHeight={layer.height}
                  strokeScale={0.12}
                  minimumStrokeWidth={1}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  stage: {
    position: "absolute",
  },
  layer: {
    position: "absolute",
  },
});
