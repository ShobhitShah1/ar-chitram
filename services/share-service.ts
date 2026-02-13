import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";
import { Alert } from "react-native";
import Share, { ShareSingleOptions, Social } from "react-native-share";

type SharePlatform =
  | "facebook"
  | "whatsapp"
  | "instagram"
  | "snapchat"
  | "more";

interface ShareImageOptions {
  imageUri: string;
  platform: SharePlatform;
  type?: "image" | "video";
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

let shareInProgress = false;

/**
 * Get the local file path from a MediaLibrary asset
 */
async function getLocalFilePath(uri: string): Promise<string> {
  try {
    // If it's already a file path, extract and return
    if (uri.startsWith("file://")) {
      return uri.substring(7);
    }

    if (uri.startsWith("/")) {
      return uri;
    }

    // For MediaLibrary assets, get the actual file path
    let assetId = uri;

    // Handle ph:// format (iOS)
    if (uri.startsWith("ph://")) {
      assetId = uri.replace("ph://", "").split("/")[0];
    }

    const assetInfo = await MediaLibrary.getAssetInfoAsync(assetId);
    if (assetInfo?.localUri) {
      return assetInfo.localUri.startsWith("file://")
        ? assetInfo.localUri.substring(7)
        : assetInfo.localUri;
    }

    return uri;
  } catch (error) {
    console.warn("Could not get local path:", error);
    return uri;
  }
}

/**
 * Convert file to base64 for sharing (most reliable method)
 */
async function fileToBase64(
  filePath: string,
  type: "image" | "video"
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(
    filePath.startsWith("file://") ? filePath : `file://${filePath}`,
    { encoding: FileSystem.EncodingType.Base64 }
  );

  const mimeType = type === "video" ? "video/mp4" : "image/jpeg";
  return `data:${mimeType};base64,${base64}`;
}

export const shareImage = async ({
  imageUri,
  platform,
  type = "image",
  onSuccess,
  onError,
}: ShareImageOptions) => {
  if (shareInProgress) return;

  if (!imageUri) {
    Alert.alert("Error", "Media URI is required");
    onError?.("Media URI is required");
    return;
  }

  shareInProgress = true;

  try {
    // Get the local file path
    const localPath = await getLocalFilePath(imageUri);
    console.log("Local path:", localPath);

    let shareUrl: string;

    // For images, use base64 (most reliable)
    // For videos, copy to cache with clean filename
    if (type === "image") {
      shareUrl = await fileToBase64(localPath, type);
      console.log("Using base64 for image");
    } else {
      // For videos, copy to cache directory with clean filename
      const cleanFilename = `gigglam_video_${Date.now()}.mp4`;
      const cacheUri = `${FileSystem.cacheDirectory}${cleanFilename}`;

      const sourcePath = localPath.startsWith("file://")
        ? localPath
        : `file://${localPath}`;

      await FileSystem.copyAsync({
        from: sourcePath,
        to: cacheUri,
      });

      shareUrl = cacheUri;
      console.log("Video copied to cache:", shareUrl);
    }

    if (platform === "more") {
      await Share.open({
        url: shareUrl,
        type: type === "video" ? "video/mp4" : "image/jpeg",
        message: "I made this with Gigglam!",
      });
      onSuccess?.();
      return;
    }

    let social: Social;

    switch (platform) {
      case "instagram":
        social = Social.Instagram;
        break;
      case "facebook":
        social = Social.Facebook;
        break;
      case "whatsapp":
        social = Social.Whatsapp;
        break;
      case "snapchat":
        social = Social.Snapchat;
        break;
      default:
        throw new Error("Unsupported platform");
    }

    const shareOptions: ShareSingleOptions = {
      url: shareUrl,
      type: type === "video" ? "video/*" : "image/*",
      social,
      filename: type === "video" ? "gigglam_video.mp4" : "gigglam_image.jpg",
      message: "I made this with Gigglam!",
    };

    await Share.shareSingle(shareOptions);
    onSuccess?.();
  } catch (error: any) {
    console.error("Share error:", error, error.message);

    const errorMsg = error?.message?.toLowerCase() || "";

    if (
      errorMsg.includes("cancel") ||
      errorMsg.includes("dismissed") ||
      errorMsg.includes("user did not share")
    ) {
      return;
    }

    if (errorMsg.includes("not installed") || errorMsg.includes("not found")) {
      const names: Record<SharePlatform, string> = {
        facebook: "Facebook",
        whatsapp: "WhatsApp",
        instagram: "Instagram",
        snapchat: "Snapchat",
        more: "Share",
      };
      Alert.alert("App Not Available", `${names[platform]} is not installed`);
      onError?.("App not installed");
      return;
    }

    Alert.alert("Share Failed", "Unable to share the media. Please try again.");
    onError?.(error.message || "Share failed");
  } finally {
    setTimeout(() => {
      shareInProgress = false;
    }, 1000);
  }
};
