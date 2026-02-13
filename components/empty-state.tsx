import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { Text } from "./themed";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

interface EmptyStateProps {
  /** Main title text */
  title: string;
  /** Subtitle/description text */
  description?: string;
  /** Optional icon name from Ionicons */
  iconName?: keyof typeof Ionicons.glyphMap;
  /** Optional image source (local or remote) */
  imageSource?: string | number;
  /** Show loading indicator instead of icon */
  showLoading?: boolean;
  /** Icon size (default: 48) */
  iconSize?: number;
  /** Image width (default: 80) */
  imageWidth?: number;
  /** Image height (default: 80) */
  imageHeight?: number;
  /** Custom icon color (default: theme.textSecondary) */
  iconColor?: string;
  /** Custom styles for the container */
  containerStyle?: StyleProp<ViewStyle>;
  /** Custom styles for the title */
  titleStyle?: StyleProp<TextStyle>;
  /** Custom styles for the description */
  descriptionStyle?: StyleProp<TextStyle>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  iconName,
  imageSource,
  showLoading = false,
  iconSize = 48,
  imageWidth = 80,
  imageHeight = 80,
  iconColor,
  containerStyle,
  titleStyle,
  descriptionStyle,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Loading indicator takes priority, then image, then icon */}
      {showLoading ? (
        <ActivityIndicator
          size="large"
          color={theme.accent}
          style={styles.icon}
        />
      ) : imageSource ? (
        <Image
          source={
            typeof imageSource === "string" ? { uri: imageSource } : imageSource
          }
          style={[
            styles.image,
            {
              width: imageWidth,
              height: imageHeight,
            },
          ]}
          contentFit="contain"
        />
      ) : iconName ? (
        <Ionicons
          name={iconName}
          size={iconSize}
          color={iconColor || theme.textSecondary}
          style={styles.icon}
        />
      ) : null}

      <Text style={[styles.title, { color: theme.textPrimary }, titleStyle]}>
        {title}
      </Text>

      {description && (
        <Text
          style={[
            styles.description,
            { color: theme.textSecondary },
            descriptionStyle,
          ]}
        >
          {description}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  icon: {
    marginBottom: 8,
  },
  image: {
    marginBottom: 8,
    borderRadius: 8,
  },
  title: {
    fontSize: 19,
    fontFamily: FontFamily.semibold,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    marginTop: 5,
    fontFamily: FontFamily.medium,
    textAlign: "center",
  },
});
