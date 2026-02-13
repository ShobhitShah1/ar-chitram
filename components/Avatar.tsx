import React, { useState } from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Image } from "expo-image";
import { FontFamily } from '@/constants/fonts';

interface AvatarProps {
  name?: string;
  imageUrl?: string;
  size?: number;
  style?: ViewStyle;
  textStyle?: any;
  backgroundColor?: string;
  textColor?: string;
}

// Generate a consistent color based on name
const generateAvatarColor = (name: string): string => {
  const colors = [
    "#FF6B9D",
    "#4ECDC4",
    "#FFE66D",
    "#A8E6CF",
    "#FF8A80",
    "#B39DDB",
    "#F8BBD9",
    "#81C784",
    "#64B5F6",
    "#FFB74D",
    "#AED581",
    "#F06292",
    "#4DB6AC",
    "#9575CD",
    "#7986CB",
    "#FF7043",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

// Get initials from name
const getInitials = (name: string): string => {
  if (!name) return "G";

  const words = name.trim().split(" ");
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

export default function Avatar({
  name = "",
  imageUrl,
  size = 80,
  style,
  textStyle,
  backgroundColor,
  textColor = "#FFFFFF",
}: AvatarProps) {
  const [imageLoadError, setImageLoadError] = useState(false);
  const initials = getInitials(name);
  const dynamicBackgroundColor = backgroundColor || generateAvatarColor(name);

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: dynamicBackgroundColor,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  };

  const fontSize = size * 0.4; // Dynamic font size based on avatar size

  // Show initials if no image URL or image failed to load
  if (!imageUrl || imageLoadError) {
    return (
      <View style={[avatarStyle, style]}>
        <Text
          style={[
            styles.initialsText,
            { fontSize, color: textColor },
            textStyle,
          ]}
        >
          {initials}
        </Text>
      </View>
    );
  }

  return (
    <View style={[avatarStyle, style]}>
      <Image
        source={{ uri: imageUrl }}
        style={[avatarStyle, { backgroundColor: "transparent" }]}
        contentFit="cover"
        onError={() => {
          setImageLoadError(true);
        }}
        onLoad={() => {
          setImageLoadError(false);
        }}
      />
      {/* Show initials while image is loading */}
      <View
        style={[
          avatarStyle,
          {
            position: "absolute",
            backgroundColor: dynamicBackgroundColor,
            zIndex: -1, // Behind the image
          },
        ]}
      >
        <Text
          style={[
            styles.initialsText,
            { fontSize, color: textColor },
            textStyle,
          ]}
        >
          {initials}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  initialsText: {
    fontFamily: FontFamily.semibold,
    textAlign: "center",
  },
});
