import { Theme } from "@/constants/colors";
import { FontFamily } from "@/constants/fonts";
import { useThemedStyles } from "@/context/theme-context";
import React from "react";
import {
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
}

const SocialButton = ({
  onPress,
  title,
  imageSource,
  style,
}: SocialButtonProps) => {
  const styles = useThemedStyles(styleCreator);

  return (
    <Pressable onPress={onPress} style={[styles.container, style]}>
      <Image source={imageSource} style={styles.icon} resizeMode="contain" />
      <Text style={styles.text}>{title}</Text>
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
  });
