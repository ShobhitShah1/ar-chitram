import { ic_upload_home } from "@/assets/icons";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface UploadEntryButtonProps {
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
}

export const UploadEntryButton: React.FC<UploadEntryButtonProps> = ({
  title,
  subtitle,
  onPress,
  disabled = false,
}) => {
  const { theme, isDark } = useTheme();
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(28,28,30,0.12)";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.cardBackground,
          borderColor,
          opacity: disabled ? 0.45 : pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.leadingIconWrap}>
        <Image
          source={ic_upload_home}
          style={styles.leadingIcon}
          contentFit="contain"
          tintColor="#FFFFFF"
        />
      </View>

      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {subtitle}
        </Text>
      </View>

      <View
        style={[
          styles.trailingBadge,
          { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F4F4F5" },
        ]}
      >
        <Text style={[styles.trailingText, { color: theme.textPrimary }]}>
          Upload
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 72,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  leadingIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#1E1E1E",
    alignItems: "center",
    justifyContent: "center",
  },
  leadingIcon: {
    width: 20,
    height: 20,
  },
  textWrap: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    lineHeight: 18,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  trailingBadge: {
    minWidth: 64,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  trailingText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    lineHeight: 16,
  },
});
