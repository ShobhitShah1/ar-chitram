import { StyleSheet, Text, View } from "react-native";
import React, { memo } from "react";
import { Pressable, SafeAreaView } from "./themed";
import { Image } from "expo-image";
import { ic_back } from "@/assets/icons";
import { router } from "expo-router";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";

const Header = ({ title }: { title: string }) => {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Pressable
        style={styles.backButton}
        onPress={() => router.canGoBack() && router.back()}
      >
        <Image
          source={ic_back}
          style={styles.backButtonImage}
          contentFit="contain"
        />
      </Pressable>

      <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
    </SafeAreaView>
  );
};

export default memo(Header);

const styles = StyleSheet.create({
  container: {
    height: 80,
    width: "100%",
    paddingHorizontal: 20,
    alignSelf: "center",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  backButton: {
    width: 35,
    height: 35,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  backButtonImage: {
    width: 20,
    height: 20,
  },
  title: {
    fontSize: 17,
    fontFamily: FontFamily.semibold,
  },
});
