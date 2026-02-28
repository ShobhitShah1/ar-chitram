import { Theme } from "@/constants/colors";
import { FontFamily } from "@/constants/fonts";
import { useThemedStyles } from "@/context/theme-context";
import React from "react";
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import { Pressable } from "../themed";

interface SocialButtonProps {
  onPress?: () => void;
  title: string;
  imageSource: ImageSourcePropType;
  style?: ViewStyle;
  isLoading?: boolean;
  loadingText?: string;
}

const SocialButton = ({
  onPress,
  title,
  imageSource,
  style,
  isLoading = false,
  loadingText = "Signing in...",
}: SocialButtonProps) => {
  const styles = useThemedStyles(styleCreator);

  return (
    <Pressable
      onPress={onPress}
      disabled={isLoading}
      style={[styles.container, style, isLoading ? styles.loadingContainer : null]}
    >
      {isLoading ? (
        <>
          <ActivityIndicator size="small" color="#2B2B2B" />
          <Text style={styles.text}>{loadingText}</Text>
        </>
      ) : (
        <>
          <Image source={imageSource} style={styles.icon} resizeMode="contain" />
          <Text style={styles.text}>{title}</Text>
        </>
      )}
    </Pressable>
  );
};

export default SocialButton;

const styleCreator = (theme: Theme) =>
  StyleSheet.create({
    container: {
      height: 60,
      width: 300,
      gap: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#fff",
      borderRadius: 40,
      marginBottom: 10,
      boxShadow: "0px 0px 25px 0px rgba(0, 0, 0, 0.05)",
    },
    text: {
      fontSize: 14,
      color: theme.textPrimary,
      textTransform: "uppercase",
      fontFamily: FontFamily.semibold,
    },
    icon: {
      width: 24,
      height: 24,
    },
    loadingContainer: {
      opacity: 0.9,
    },
  });
