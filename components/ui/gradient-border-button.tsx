import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontFamily } from "@/constants/fonts";

interface GradientBorderButtonProps {
  onPress: () => void;
  label: string;
  price?: string;
  colors?: string[];
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  priceStyle?: StyleProp<TextStyle>;
  innerBackgroundColor?: string;
}

export const GradientBorderButton: React.FC<GradientBorderButtonProps> = ({
  onPress,
  label,
  price,
  colors = ["#FFD700", "#FFB800", "#FF8A00"],
  style,
  labelStyle,
  priceStyle,
  innerBackgroundColor = "#FFC700",
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.container, style]}
    >
      <LinearGradient
        colors={colors as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientBorder}
      >
        <View
          style={[
            styles.buttonInner,
            { backgroundColor: innerBackgroundColor },
          ]}
        >
          <Text style={[styles.buttonLabel, labelStyle]}>{label}</Text>
          {price && (
            <Text style={[styles.buttonPrice, priceStyle]}>{price}</Text>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 60,
  },
  gradientBorder: {
    flex: 1,
    borderRadius: 16,
    padding: 2,
  },
  buttonInner: {
    flex: 1,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 25,
  },
  buttonLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: "#000",
  },
  buttonPrice: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: "#000",
  },
});
