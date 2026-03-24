import { FontFamily } from "@/constants/fonts";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";

interface PremiumChoiceButtonProps {
  accentTextColor: string;
  colors: [string, string, ...string[]];
  detail: string;
  disabled?: boolean;
  iconSource: number;
  label: string;
  labelColor: string;
  onPress: () => void;
  pillBackgroundColor: string;
  pillLabel: string;
  pillTextColor: string;
  style?: StyleProp<ViewStyle>;
  variant?: "full" | "compact";
}

export const PremiumChoiceButton: React.FC<PremiumChoiceButtonProps> = ({
  accentTextColor,
  colors,
  detail,
  disabled = false,
  iconSource,
  label,
  labelColor,
  onPress,
  pillBackgroundColor,
  pillLabel,
  pillTextColor,
  style,
  variant = "full",
}) => {
  const isCompact = variant === "compact";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.touch,
        style,
        disabled ? styles.disabled : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.button,
          isCompact ? styles.buttonCompact : styles.buttonFull,
        ]}
      >
        <View
          style={[
            styles.labelGroup,
            isCompact ? styles.labelGroupCompact : styles.labelGroupFull,
          ]}
        >
          <Image
            source={iconSource}
            style={[styles.icon, isCompact ? styles.iconCompact : null]}
            contentFit="contain"
          />
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              isCompact ? styles.labelCompact : styles.labelFull,
              { color: labelColor },
            ]}
          >
            {label}
          </Text>
        </View>

        <View
          style={[
            styles.meta,
            isCompact ? styles.metaCompact : styles.metaFull,
          ]}
        >
          <View
            style={[
              styles.pill,
              isCompact ? styles.pillCompact : null,
              { backgroundColor: pillBackgroundColor },
            ]}
          >
            <Text
              style={[
                styles.pillText,
                isCompact ? styles.pillTextCompact : styles.pillTextFull,
                { color: pillTextColor },
              ]}
            >
              {pillLabel}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={[
              styles.detail,
              isCompact ? styles.detailCompact : styles.detailFull,
              { color: accentTextColor },
            ]}
          >
            {detail}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  touch: {
    borderRadius: 10,
  },
  pressed: {
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.6,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  buttonFull: {
    minHeight: 46,
    paddingLeft: 14,
    paddingRight: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonCompact: {
    minHeight: 50,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  labelGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  labelGroupFull: {
    position: "absolute",
    left: 14,
    right: 64,
    justifyContent: "center",
    gap: 8,
  },
  labelGroupCompact: {
    flex: 1,
    justifyContent: "flex-start",
    gap: 6,
    paddingRight: 4,
  },
  icon: {
    width: 16,
    height: 16,
  },
  iconCompact: {
    width: 15,
    height: 15,
  },
  label: {
    fontFamily: FontFamily.bold,
  },
  labelFull: {
    fontSize: 16,
    lineHeight: 18,
  },
  labelCompact: {
    flex: 1,
    fontSize: 12,
    lineHeight: 14,
  },
  meta: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  metaFull: {
    marginLeft: "auto",
    width: 64,
    zIndex: 1,
  },
  metaCompact: {
    width: 54,
    flexShrink: 0,
  },
  pill: {
    minWidth: 36,
    height: 20,
    borderRadius: 5,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pillCompact: {
    minWidth: 42,
    height: 18,
    paddingHorizontal: 6,
  },
  pillText: {
    fontFamily: FontFamily.bold,
  },
  pillTextFull: {
    fontSize: 10,
    lineHeight: 12,
  },
  pillTextCompact: {
    fontSize: 9,
    lineHeight: 10,
  },
  detail: {
    fontFamily: FontFamily.bold,
    textAlign: "right",
  },
  detailFull: {
    width: 64,
    marginTop: 1,
    fontSize: 9,
    lineHeight: 10,
  },
  detailCompact: {
    width: 54,
    marginTop: 2,
    fontSize: 8,
    lineHeight: 9,
  },
});
