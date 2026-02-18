// Placeholder
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect } from "react";
import {
  Alert,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ic_back,
  ic_facebook,
  ic_instagram,
  ic_share,
  ic_snapchat,
  ic_whatsapp,
} from "@/assets/icons";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import * as FileSystem from "expo-file-system";
import { Image, ImageBackground } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Share, { Social } from "react-native-share";

const socialButtons = [
  { icon: ic_facebook, color: "#1877F2", platform: "facebook" as const },
  { icon: ic_whatsapp, color: "#25D366", platform: "whatsapp" as const },
  { icon: ic_instagram, color: "#E4405F", platform: "instagram" as const },
  { icon: ic_snapchat, color: "#FFFC00", platform: "snapchat" as const },
  { icon: ic_share, color: "#666", platform: "more" as const },
];

const ShareScreen = () => {
  const { imageUri } = useLocalSearchParams();
  const { theme } = useTheme();
  const { top, bottom } = useSafeAreaInsets();

  const handleClose = () => {
    // Navigate home and clean up
    router.replace("/(tabs)/home");
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleClose();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, []),
  );

  // Convert local file to base64 for Instagram (required)
  const convertToBase64 = async (fileUri: string): Promise<string> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: "base64",
      });
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error("Error converting to base64:", error);
      throw error;
    }
  };

  const handleSocialShare = async (
    platform: (typeof socialButtons)[number]["platform"],
  ) => {
    if (!imageUri) return;

    try {
      const shareMessage =
        "Check out my AR Drawing creation! Download the app to create yours.";
      const uriString = imageUri as string;

      switch (platform) {
        case "facebook":
          await Share.shareSingle({
            message: shareMessage,
            url: uriString,
            social: Social.Facebook,
          });
          break;

        case "whatsapp":
          await Share.shareSingle({
            message: shareMessage,
            url: uriString,
            social: Social.Whatsapp,
          });
          break;

        case "instagram":
          // Instagram requires base64
          const base64Image = await convertToBase64(uriString);
          await Share.shareSingle({
            social: Social.Instagram,
            url: base64Image,
            type: "image/*",
          });
          break;

        case "snapchat":
          await Share.shareSingle({
            message: shareMessage,
            url: uriString,
            social: Social.Snapchat,
          });
          break;

        case "more":
        default:
          await Share.open({
            message: shareMessage,
            url: uriString,
            type: "image/png",
          });
          break;
      }
    } catch (error: any) {
      // Handle cancellation/errors similarly to modal
      if (
        error?.message?.toLowerCase().includes("user did not share") ||
        error?.message?.toLowerCase().includes("cancel")
      ) {
        return;
      }

      if (
        error?.message?.toLowerCase().includes("not installed") ||
        error?.message?.toLowerCase().includes("not found")
      ) {
        Alert.alert(
          "App Not Available",
          `The app is not installed on this device.`,
        );
        return;
      }

      console.error("Share error", error);
      // Fallback to generic share if specific fails?
      // Or just alert.
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: imageUri as string }}
        style={styles.fullScreenBackground}
        contentFit="cover"
      >
        <LinearGradient
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          colors={["rgba(0,0,0,0.9)", "rgba(0,0,0,0.4)", "transparent"]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.overlay}>
          {/* Back Button */}
          <Pressable
            style={[styles.backButton, { top: top + 15 }]}
            onPress={() => handleClose()}
          >
            <Image
              source={ic_back}
              style={{ width: 24, height: 24 }}
              tintColor="white"
              contentFit="contain"
            />
          </Pressable>

          <View style={[styles.content, { paddingBottom: bottom + 20 }]}>
            <View style={styles.socialContainer}>
              {socialButtons.map((button, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.socialButton,
                    { backgroundColor: button.color },
                  ]}
                  onPress={() => handleSocialShare(button.platform)}
                >
                  <Image
                    source={button.icon}
                    tintColor={
                      button.platform === "more" ||
                      button.platform === "instagram"
                        ? "#fff"
                        : undefined
                    }
                    contentFit="contain"
                    style={[
                      styles.socialIcon,
                      button.platform === "more" && { right: 1.5 },
                    ]}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

export default ShareScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  fullScreenBackground: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  backButton: {
    position: "absolute",
    left: 20,
    zIndex: 10,
    padding: 8,
    // Minimal background for visibility
    // backgroundColor: "rgba(255, 255, 255, 0.2)",
    // Or just no background if user insists "nothing else".
    // But arrow needs contrast.
    // I will use a small circle for contrast.
    // backgroundColor: "white",
    // borderRadius: 20,
  },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    width: "100%",
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 15,
    marginBottom: 20,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  socialIcon: {
    width: 28,
    height: 28,
  },
});
