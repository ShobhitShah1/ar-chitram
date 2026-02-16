import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { Pressable } from "./themed";
import { Image } from "expo-image";
import { ic_setting, ic_suffel, ic_upload_home } from "@/assets/icons";
import { router } from "expo-router";
import { useTheme } from "@/context/theme-context";
import { FontFamily } from "@/constants/fonts";

interface Props {
  isShuffle?: boolean;
  onUploadPress?: () => void;
  onShufflePress?: () => void;
}

const TabsHeader = ({
  onUploadPress,
  isShuffle = false,
  onShufflePress,
}: Props) => {
  const { theme } = useTheme();

  return (
    <View style={styles.headerContainer}>
      <Text style={[styles.gigglamText, { color: theme.textPrimary }]}>
        AR Chitram
      </Text>

      <View style={styles.rightContainer}>
        {isShuffle ? (
          <Pressable onPress={onShufflePress}>
            <Image
              contentFit="contain"
              source={ic_suffel}
              style={styles.iconSmall}
            />
          </Pressable>
        ) : (
          <>
            <Pressable onPress={onUploadPress}>
              <Image
                contentFit="contain"
                source={ic_upload_home}
                style={styles.iconMedium}
              />
            </Pressable>
            <Pressable onPress={() => router.push("/other/new-setting")}>
              <Image
                contentFit="contain"
                source={ic_setting}
                style={styles.iconSmall}
              />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
};

export default TabsHeader;

const styles = StyleSheet.create({
  headerContainer: {
    marginHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rightContainer: {
    gap: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  gigglamText: {
    fontFamily: FontFamily.galada,
    fontSize: 23,
  },

  iconMedium: {
    width: 30,
    height: 30,
    bottom: 2,
  },
  iconSmall: {
    width: 23,
    height: 23,
  },
});
