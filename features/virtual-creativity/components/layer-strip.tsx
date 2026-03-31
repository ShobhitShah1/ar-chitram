import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { DrawingLayerSvg } from "@/features/virtual-creativity/components/drawing-layer-svg";
import { VirtualLayerVisual } from "@/features/virtual-creativity/components/layer-visual";
import { VirtualLayer } from "@/features/virtual-creativity/store/virtual-creativity-store";

interface LayerStripProps {
  layers: VirtualLayer[];
  handModeLayerIds: ReadonlySet<string>;
  onToggleHandMode: (id: string) => void;
  onSelectLayer?: (id: string) => void;
  isZoomMode?: boolean;
  horizontalInset?: number;
  reserveSpace?: boolean;
}

export const LayerStrip: React.FC<LayerStripProps> = ({
  layers,
  handModeLayerIds,
  onToggleHandMode,
  onSelectLayer,
  isZoomMode = false,
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
        <View
          style={[styles.stripRow, { paddingHorizontal: horizontalInset }]}
        >
          {/* Layer thumbnails stacked on the left */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailStack}
            style={styles.thumbnailScroll}
          >
            {orderedLayers.map((layer, index) => (
              <Pressable
                key={layer.id}
                onPress={() => onSelectLayer?.(layer.id)}
                style={[
                  styles.thumbnailWrapper,
                  index > 0 && { marginLeft: -12 },
                  { zIndex: orderedLayers.length - index },
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

          {/* Hand toggle on the right - only controls non-background image overlays */}
          {orderedLayers.some((l) => l.type === "image" && l.id !== "main-image") ? (
            <Pressable
              onPress={() => {
                if (isZoomMode) {
                  return;
                }
                const overlayImages = orderedLayers.filter(
                  (l) => l.type === "image" && l.id !== "main-image",
                );
                const anyHandActive = overlayImages.some((l) =>
                  handModeLayerIds.has(l.id),
                );
                for (const layer of overlayImages) {
                  const isHand = handModeLayerIds.has(layer.id);
                  if (anyHandActive && isHand) {
                    onToggleHandMode(layer.id);
                  } else if (!anyHandActive && !isHand) {
                    onToggleHandMode(layer.id);
                  }
                }
              }}
              style={[
                styles.handButton,
                orderedLayers.some(
                  (l) =>
                    l.type === "image" &&
                    l.id !== "main-image" &&
                    handModeLayerIds.has(l.id),
                )
                  ? styles.handButtonActive
                  : styles.handButtonInactive,
                isZoomMode && { opacity: 0.3 },
              ]}
              hitSlop={8}
              disabled={isZoomMode}
            >
              <Ionicons
                name="hand-left"
                size={18}
                color={
                  orderedLayers.some(
                    (l) =>
                      l.type === "image" &&
                      l.id !== "main-image" &&
                      handModeLayerIds.has(l.id),
                  )
                    ? "#FFFFFF"
                    : "#666666"
                }
              />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 48,
    justifyContent: "center",
    marginBottom: 0,
  },
  stripRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  thumbnailScroll: {
    flexShrink: 1,
  },
  thumbnailStack: {
    alignItems: "center",
  },
  thumbnailWrapper: {
    width: 42,
    height: 42,
    borderRadius: 8,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    borderWidth: 2,
    borderColor: "#fff",
  },
  colorPlaceholder: {
    flex: 1,
  },
  handButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  handButtonActive: {
    backgroundColor: "#000000",
  },
  handButtonInactive: {
    backgroundColor: "rgba(0,0,0,0.06)",
  },
});
