import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/context/theme-context";

type ParamLike = string | string[] | undefined;

const coerceParam = (value: ParamLike): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
};

interface SignatureOverlayProps {
  signatureText?: ParamLike;
  signatureFontFamily?: ParamLike;
}

export const SignatureOverlay: React.FC<SignatureOverlayProps> = ({
  signatureText,
  signatureFontFamily,
}) => {
  const { isDark } = useTheme();
  const text = coerceParam(signatureText)?.trim();
  const fontFamily = coerceParam(signatureFontFamily);

  if (!text || !fontFamily) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Text
        style={[
          styles.text,
          {
            fontFamily,
            color: isDark ? "rgba(255,255,255,0.92)" : "rgba(20,20,20,0.92)",
            textShadowColor: isDark
              ? "rgba(0,0,0,0.35)"
              : "rgba(255,255,255,0.35)",
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: "flex-end",
    justifyContent: "flex-end",
  },
  text: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: 0.2,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
