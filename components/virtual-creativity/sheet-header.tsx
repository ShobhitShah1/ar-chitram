import { ic_check } from "@/assets/icons";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface SheetHeaderProps {
  title: string;
  onClose: () => void;
  onConfirm: () => void;
}

const SheetHeaderComponent: React.FC<SheetHeaderProps> = ({
  title,
  onClose,
  onConfirm,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.header}>
      <Pressable onPress={onClose} style={styles.closeBtn}>
        <Ionicons name="close" size={24} color={isDark ? "#fff" : "#000"} />
      </Pressable>
      <Text style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>
        {title}
      </Text>
      <Pressable
        onPress={onConfirm}
        style={[
          styles.applyBtn,
          {
            backgroundColor: isDark ? "rgba(65, 64, 64, 0.45)" : "white",
            boxShadow: "0px 4px 20px 0px rgba(0, 0, 0, 0.15)" as any, // Cast for TS
          },
        ]}
      >
        <Image
          source={ic_check}
          contentFit="contain"
          style={{ width: 16, height: 16 }}
          tintColor={isDark ? "#fff" : "#000"}
        />
      </Pressable>
    </View>
  );
};

export const SheetHeader = React.memo(SheetHeaderComponent);

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: FontFamily.semibold,
  },
  applyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  // header: {
  //   height: 60,
  //   flexDirection: "row",
  //   alignItems: "center",
  //   justifyContent: "space-between",
  //   paddingHorizontal: 14,
  // },
  // title: {
  //   fontSize: 19,
  //   fontFamily: FontFamily.semibold,
  // },
  // closeBtn: {
  //   width: 35,
  //   height: 35,
  //   borderRadius: 15,
  //   justifyContent: "center",
  //   alignItems: "center",
  // },
  // confirmBtn: {
  //   width: 35,
  //   height: 35,
  //   borderRadius: 5000,
  //   justifyContent: "center",
  //   alignItems: "center",
  //   boxShadow: "0px 0px 20px 0px rgba(0,0,0,0.15)",
  // },
  // checkIcon: {
  //   width: 14,
  //   height: 14,
  // },
});
