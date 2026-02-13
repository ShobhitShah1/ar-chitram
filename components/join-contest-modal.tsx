import {
  ic_facebook,
  ic_instagram,
  ic_share,
  ic_snapchat,
  ic_whatsapp,
} from "@/assets/icons";
import { Images } from "@/assets/images";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { useJoinContest } from "@/hooks/api/use-contest-api";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { Image, ImageBackground } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Share, { Social } from "react-native-share";

interface JoinContestModalProps {
  visible: boolean;
  onClose: () => void;
  downloadedImageUri: string;
}

const socialButtons = [
  { icon: ic_facebook, color: "#1877F2", platform: "facebook" as const },
  { icon: ic_whatsapp, color: "#25D366", platform: "whatsapp" as const },
  { icon: ic_instagram, color: "#E4405F", platform: "instagram" as const },
  { icon: ic_snapchat, color: "#FFFC00", platform: "snapchat" as const },
  { icon: ic_share, color: "#666", platform: "more" as const },
];

export const JoinContestModal: React.FC<JoinContestModalProps> = ({
  visible,
  onClose,
  downloadedImageUri,
}) => {
  const { theme } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const { mutate: joinContest, isPending } = useJoinContest();

  const handleJoinContest = () => {
    joinContest(
      { imageUri: downloadedImageUri },
      {
        onSuccess: () => {
          Alert.alert(
            "Success!",
            "You've successfully joined the contest. Good luck!",
            [{ text: "OK", onPress: onClose }]
          );
        },
        onError: (error) => {
          Alert.alert(
            "Error",
            error.message || "Failed to join contest. Please try again."
          );
        },
      }
    );
  };

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
    platform: (typeof socialButtons)[number]["platform"]
  ) => {
    try {
      const shareMessage =
        "I just created this amazing image with Gigglam! Join the contest and create your own.";

      switch (platform) {
        case "facebook":
          // Facebook: Can use local file URI directly
          await Share.shareSingle({
            message: shareMessage,
            url: downloadedImageUri,
            social: Social.Facebook,
          });
          break;

        case "whatsapp":
          // WhatsApp: Can use local file URI directly
          await Share.shareSingle({
            message: shareMessage,
            url: downloadedImageUri,
            social: Social.Whatsapp,
            // Optional: Add whatsAppNumber if you want to share to specific number
            // whatsAppNumber: "9199999999", // country code + phone number
          });
          break;

        case "instagram":
          // Instagram: MUST use base64 format according to documentation
          // Also requires type: 'image/*'
          const base64Image = await convertToBase64(downloadedImageUri);
          await Share.shareSingle({
            social: Social.Instagram,
            url: base64Image,
            type: "image/*",
          });
          break;

        case "snapchat":
          // Snapchat: Can use local file URI (Android only)
          // Note: message and url will be concatenated
          await Share.shareSingle({
            message: shareMessage,
            url: downloadedImageUri,
            social: Social.Snapchat,
          });
          break;

        case "more":
          // General share dialog: Works with local file URI
          await Share.open({
            message: shareMessage,
            url: downloadedImageUri,
            type: "image/png",
          });
          break;

        default:
          // Fallback to general share
          await Share.open({
            message: shareMessage,
            url: downloadedImageUri,
            type: "image/png",
          });
      }
    } catch (error: any) {
      // Handle user cancellation (not an error - user just closed the sheet)
      if (
        error?.message?.toLowerCase().includes("user did not share") ||
        error?.message?.toLowerCase().includes("cancel") ||
        error?.message?.toLowerCase().includes("user cancelled") ||
        error === "User did not share"
      ) {
        return;
      }

      // Handle app not installed
      if (
        error?.message?.toLowerCase().includes("not installed") ||
        error?.message?.toLowerCase().includes("not found") ||
        error?.message?.toLowerCase().includes("no app")
      ) {
        const platformName =
          platform.charAt(0).toUpperCase() + platform.slice(1);
        Alert.alert(
          "App Not Available",
          `The ${platformName} app is not installed on this device. Please install it to share.`
        );
        return;
      }

      // Handle permission errors (specifically for Instagram)
      if (
        error?.message?.toLowerCase().includes("permission") ||
        error?.message?.toLowerCase().includes("photo library")
      ) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library in settings to share to Instagram."
        );
        return;
      }

      // Log the error for debugging

      // Show generic error for unexpected issues
      Alert.alert(
        "Share Failed",
        "Unable to share to this platform. Please try another option."
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <ImageBackground
        source={downloadedImageUri}
        style={styles.fullScreenBackground}
        contentFit="cover"
        cachePolicy="memory-disk"
      >
        <LinearGradient
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          colors={["rgba(0,0,0,0.9)", "rgba(0,0,0,0.4)", "transparent"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.overlay}>
          <Pressable
            style={[styles.closeButton, { top: top + 15 }]}
            onPress={onClose}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>

          <View style={[styles.content, { paddingBottom: bottom }]}>
            <Text style={styles.title}>
              Join the contest and share your creation with friends! Good luck!
            </Text>

            <Pressable
              style={styles.logoContainer}
              onPress={handleJoinContest}
              disabled={isPending}
            >
              <Image
                source={Images.JoinContest}
                style={styles.logo}
                contentFit="contain"
              />
              {isPending && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={theme.accent} />
                </View>
              )}
            </Pressable>

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
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  closeButton: {
    position: "absolute",
    // top: 55,
    left: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: "rgba(17, 15, 15, 1)",
    borderRadius: 50,
  },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    maxWidth: 320,
    width: "100%",
  },
  title: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
    paddingHorizontal: 20,
    fontFamily: FontFamily.medium,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  logoContainer: {
    marginBottom: 30,
    alignItems: "center",
    position: "relative",
  },
  logo: {
    width: 300,
    height: 150,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 10,
  },
  imagePreview: {
    width: 140,
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    marginBottom: 25,
  },
  socialButton: {
    width: 45,
    height: 45,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  socialIcon: {
    width: 25,
    height: 25,
  },
});
