import { FontFamily } from "@/constants/fonts";
import type { VirtualLayer } from "@/features/virtual-creativity/store/virtual-creativity-store";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const FALLBACK_SIGNATURE_TEXT = "AR Chitram";

interface VirtualLayerVisualProps {
  layer: VirtualLayer;
}

const VirtualLayerVisualComponent: React.FC<VirtualLayerVisualProps> = ({
  layer,
}) => {
  if (layer.type === "text") {
    const text = layer.text?.trim() || FALLBACK_SIGNATURE_TEXT;
    const fontSize = Math.max(
      18,
      layer.fontSize ?? Math.min(layer.height * 0.78, 64),
    );

    return (
      <View style={styles.textWrap} pointerEvents="none">
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.2}
          numberOfLines={1}
          style={[
            styles.text,
            {
              color: layer.color || "#111111",
              fontFamily: layer.fontFamily || FontFamily.signatureMonteCarlo,
              fontSize,
            },
          ]}
        >
          {text}
        </Text>
      </View>
    );
  }

  if (!layer.uri) {
    return null;
  }

  return (
    <Image
      source={{ uri: layer.uri }}
      style={styles.image}
      contentFit="contain"
      transition={0}
    />
  );
};

export const VirtualLayerVisual = React.memo(VirtualLayerVisualComponent);

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
  },
  textWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    width: "100%",
    textAlign: "center",
    includeFontPadding: false,
  },
});
