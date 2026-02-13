import { Theme } from "@/constants/colors";
import { FontFamily, typography } from "@/constants/fonts";
import { useThemedStyles } from "@/context/theme-context";
import React from "react";
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  TouchableOpacity,
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.modalBackground,
      height: 60,
      paddingHorizontal: 24,
      borderRadius: 40,
      width: "80%",
      marginBottom: 10,
      gap: 12,
      boxShadow: "0px 0px 25px 0px rgba(0, 0, 0, 0.05)",
    },
    text: {
      ...typography.button,
      fontFamily: FontFamily.bold,
      color: theme.textPrimary,
      fontSize: 14,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    icon: {
      width: 24,
      height: 24,
    },
  });
