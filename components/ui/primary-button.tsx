import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
  TextStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable } from "@/components/themed";
import { FontFamily } from "@/constants/fonts";

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  colors?: readonly [string, string, ...string[]]; // Optional gradient colors
  disabled?: boolean;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  style,
  textStyle,
  colors,
  disabled,
}) => {
  const content = (
    <View style={[styles.buttonContent, disabled && styles.disabledContent]}>
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </View>
  );

  if (colors && colors.length > 0) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[styles.container, style]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.container, styles.solidButton, style]}
    >
      {content}
    </Pressable>
  );
};

export default PrimaryButton;

const styles = StyleSheet.create({
  container: {
    borderRadius: 30,
    overflow: "hidden",
    minWidth: 150,
    height: 50,
  },
  gradient: {
    flex: 1,
    height: "100%",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  solidButton: {
    backgroundColor: "#333", // Dark color from the mockup
    justifyContent: "center",
    alignItems: "center",
  },
  buttonContent: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledContent: {
    opacity: 0.6,
  },
  text: {
    fontFamily: FontFamily.bold, // Assuming bold font exists based on user's previous code
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
  },
});
