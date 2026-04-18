import Constants from "expo-constants";
import { Platform } from "react-native";
import SpInAppUpdates, { IAUUpdateKind } from "sp-react-native-in-app-updates";

export interface AppUpdateInfo {
  isAvailable: boolean;
  latestVersion?: string;
}

const inAppUpdates = new SpInAppUpdates(false);

export async function checkForStoreUpdate(): Promise<AppUpdateInfo | null> {
  try {
    const currentVersion = Constants.expoConfig?.version ?? "1.0.0";
    const result = await inAppUpdates.checkNeedsUpdate({
      curVersion: currentVersion,
    });

    if (!result.shouldUpdate) {
      return null;
    }

    return {
      isAvailable: true,
      latestVersion: result.storeVersion,
    };
  } catch (error) {
    console.error("[Update] Failed to check store update", error);
    return null;
  }
}

export async function startStoreUpdate(): Promise<boolean> {
  try {
    const updateOptions =
      Platform.OS === "android"
        ? { updateType: IAUUpdateKind.IMMEDIATE }
        : {
            title: "Update Available",
            message:
              "A new version of Ar Chitram is available on the App Store.",
            buttonUpgradeText: "Update",
            buttonCancelText: "Cancel",
            forceUpgrade: true,
          };

    await inAppUpdates.startUpdate(updateOptions);
    return true;
  } catch (error) {
    console.error("[Update] Failed to start store update", error);
    return false;
  }
}
