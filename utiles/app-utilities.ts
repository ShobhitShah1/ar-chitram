import * as StoreReview from "expo-store-review";
import Constants from "expo-constants";
import DeviceInfo from "react-native-device-info";
import { Alert, Linking, Platform } from "react-native";
import Share from "react-native-share";
import MMKVStorage from "react-native-mmkv-storage";

const storage = new MMKVStorage.Loader().initialize();

const REVIEW_STATUS_KEY = "app_review_status";

interface ReviewStatus {
  hasReviewed: boolean;
  lastPromptDate?: string;
  reviewCount: number;
}

/**
 * Gets the stored review status
 */
const getReviewStatus = (): ReviewStatus => {
  try {
    const status = storage.getString(REVIEW_STATUS_KEY);
    return status ? JSON.parse(status) : { hasReviewed: false, reviewCount: 0 };
  } catch {
    return { hasReviewed: false, reviewCount: 0 };
  }
};

/**
 * Marks that user has reviewed the app
 */
export const markAsReviewed = (): void => {
  try {
    const status = getReviewStatus();
    storage.setString(
      REVIEW_STATUS_KEY,
      JSON.stringify({
        ...status,
        hasReviewed: true,
        lastPromptDate: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.error("Error saving review status:", error);
  }
};

/**
 * Increments review prompt count
 */
const incrementReviewCount = (): void => {
  try {
    const status = getReviewStatus();
    storage.setString(
      REVIEW_STATUS_KEY,
      JSON.stringify({
        ...status,
        reviewCount: status.reviewCount + 1,
        lastPromptDate: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.error("Error updating review count:", error);
  }
};

/**
 * Resets review status (useful for testing)
 */
export const resetReviewStatus = (): void => {
  try {
    storage.removeItem(REVIEW_STATUS_KEY);
  } catch (error) {
    console.error("Error resetting review status:", error);
  }
};

export const openAppForRating = async () => {
  try {
    const status = getReviewStatus();

    // If user already reviewed, open store directly
    if (status.hasReviewed) {
      await openAppStore();
      return;
    }

    const isAvailable = await StoreReview.isAvailableAsync();

    if (isAvailable) {
      await StoreReview.requestReview();
      incrementReviewCount();
    } else {
      await openAppStore();
    }
  } catch (error) {
    console.error("Error opening app for rating:", error);
    await openAppStore();
  }
};

const openAppStore = async () => {
  const appId =
    Constants.expoConfig?.ios?.appStoreUrl?.match(/id(\d+)/)?.[1] || "";
  const playStoreId = DeviceInfo.getBundleId();

  try {
    if (Platform.OS === "ios") {
      const appStoreUrl = `https://apps.apple.com/app/id${appId}?action=write-review`;
      const supported = await Linking.canOpenURL(appStoreUrl);

      if (supported) {
        await Linking.openURL(appStoreUrl);
      } else {
        throw new Error("Cannot open App Store");
      }
    } else {
      const playStoreUrl = `https://play.google.com/store/apps/details?id=${playStoreId}`;
      const marketUrl = `market://details?id=${playStoreId}`;

      const canOpenMarket = await Linking.canOpenURL(marketUrl);

      if (canOpenMarket) {
        await Linking.openURL(marketUrl);
      } else {
        await Linking.openURL(playStoreUrl);
      }
    }
  } catch (error) {
    console.error("Error opening app store:", error);
    Alert.alert(
      "Error",
      "Unable to open the app store. Please search for Gigglam in your app store."
    );
  }
};

export const shareAppWithFriends = async () => {
  try {
    const bundleId = DeviceInfo.getBundleId();
    const appName = await DeviceInfo.getApplicationName();

    const appUrl =
      Platform.OS === "ios"
        ? Constants.expoConfig?.ios?.appStoreUrl ||
          `https://apps.apple.com/app/${bundleId}`
        : Constants.expoConfig?.android?.playStoreUrl ||
          `https://play.google.com/store/apps/details?id=${bundleId}`;

    const message = `Check out ${appName}! 🎉\n\nCreate rooms, share images, and have fun with friends!\n\nDownload it here: ${appUrl}`;

    const shareOptions = {
      title: `Share ${appName} with Friends`,
      message: message,
      // url: appUrl,
      subject: `Check out ${appName}!`,
    };

    try {
      await Share.open(shareOptions);
    } catch (shareError: any) {}
  } catch (error) {
    console.error("Error sharing app:", error);

    const appName = await DeviceInfo.getApplicationName();

    Alert.alert(
      `Share ${appName}`,
      `Check out ${appName}! 🎉\n\nCreate rooms, share images, and have fun with friends!`,
      [
        { text: "OK", style: "default" },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }
};

/**
 * Opens external links safely
 */
export const openExternalLink = async (url: string) => {
  try {
    const supported = await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Error", "Unable to open the link");
    }
  } catch (error) {
    console.error("Error opening external link:", error);
    Alert.alert("Error", "Unable to open the link");
  }
};

/**
 * Gets app version information dynamically
 */
export const getAppVersion = () => {
  return {
    version: DeviceInfo.getVersion(),
    buildNumber: DeviceInfo.getBuildNumber(),
    bundleId: DeviceInfo.getBundleId(),
  };
};

/**
 * Formats app info for sharing or display
 */
export const getAppInfo = async () => {
  const { version, buildNumber, bundleId } = getAppVersion();
  const appName = await DeviceInfo.getApplicationName();

  return {
    name: appName,
    version,
    buildNumber,
    bundleId,
    description: "Create rooms, share images, and have fun with friends!",
  };
};
