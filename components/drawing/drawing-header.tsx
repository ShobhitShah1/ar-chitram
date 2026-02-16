import { ic_back, ic_guide } from "@/assets/icons";
import { FontFamily } from "@/constants/fonts";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable } from "../themed";

interface DrawingHeaderProps {
  onComplete?: () => void;
}

const DrawingHeader: React.FC<DrawingHeaderProps> = ({ onComplete }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 5 }]}>
      <View style={styles.leftContainer}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Image
            source={ic_back}
            style={styles.iconStyle}
            contentFit="contain"
            tintColor={"white"}
          />
        </Pressable>

        <Pressable
          style={styles.iconButton}
          onPress={() =>
            router.push({
              pathname: "/drawing/guide",
              params: { fromEdit: "true" },
            })
          }
        >
          <Image
            source={ic_guide}
            style={[styles.iconStyle, { width: 25, height: 25 }]}
            contentFit="contain"
          />
        </Pressable>
      </View>

      <View style={styles.rightContainer}>
        <Pressable onPress={onComplete} style={styles.completeButton}>
          <Text style={styles.completeText}>Complete</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default DrawingHeader;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    backgroundColor: "transparent",
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  rightContainer: {},
  iconButton: {
    // width: 35,
    // height: 35,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  completeButton: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  completeText: {
    color: "white",
    fontSize: 14,
    fontFamily: FontFamily.medium,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
});
