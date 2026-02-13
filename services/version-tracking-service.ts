/**
 * Version Tracking Service
 *
 * Simple service to track app installs/updates using existing API infrastructure.
 * Uses MMKV storage that persists across app updates and logouts.
 */
import { debugLog } from "@/constants/debug";
import { storage } from "@/utiles/storage";
import Constants from "expo-constants";
import { makeApiRequest } from "./api-service";

interface VersionInfo {
  version_name: string;
  version_code: string;
  install_event_sent: boolean;
  last_updated: number;
}

// MMKV key that should NEVER be deleted, even on logout/clear
const VERSION_TRACKING_KEY = "app_version_tracking_permanent";

// Flag to prevent multiple simultaneous calls
let isProcessing = false;

/**
 * Gets stored version info from MMKV
 */
function getStoredVersionInfo(): VersionInfo | null {
  try {
    const stored = storage.getString(VERSION_TRACKING_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    debugLog.error("Error reading stored version info:", error);
    return null;
  }
}

/**
 * Saves version info to MMKV
 */
function saveVersionInfo(versionInfo: VersionInfo): void {
  try {
    storage.setString(VERSION_TRACKING_KEY, JSON.stringify(versionInfo));
    debugLog.info("Version info saved to persistent storage", versionInfo);
  } catch (error) {
    debugLog.error("Error saving version info:", error);
  }
}

/**
 * Makes API call using existing makeApiRequest from api-service
 */
async function sendVersionEvent(
  oldVersionCode: string,
  newVersionCode: string,
): Promise<boolean> {
  try {
    const currentVersionName = Constants.expoConfig?.version || "1.0.0";

    debugLog.info("Sending version tracking event", {
      eventName: "install",
      version_name: currentVersionName,
      old_version_code: oldVersionCode,
      new_version_code: newVersionCode,
    });

    await makeApiRequest({
      eventName: "install",
      version_name: currentVersionName,
      new_version_code: newVersionCode,
      old_version_code: oldVersionCode,
    });

    debugLog.info("Version tracking event sent successfully");
    return true;
  } catch (error) {
    debugLog.error("Failed to send version tracking event:", error);
    return false;
  }
}

/**
 * Main function to handle version tracking logic
 * Call this once during app initialization
 */
export async function handleVersionTracking(): Promise<void> {
  // Prevent multiple simultaneous calls
  if (isProcessing) {
    debugLog.info("Version tracking already in progress, skipping");
    return;
  }

  try {
    isProcessing = true;

    const currentVersionCode = Constants.expoConfig?.version || "1.0.0";
    const currentVersionName = Constants.expoConfig?.version || "1.0.0";

    debugLog.info("Starting version tracking check", {
      currentVersionName,
      currentVersionCode,
    });

    const storedInfo = getStoredVersionInfo();
    const now = Date.now();

    if (!storedInfo) {
      // First time app installation
      debugLog.info("First time installation detected");

      const success = await sendVersionEvent(
        currentVersionCode,
        currentVersionCode,
      );

      saveVersionInfo({
        version_name: currentVersionName,
        version_code: currentVersionCode,
        install_event_sent: success,
        last_updated: now,
      });

      return;
    }

    // Check if version has changed
    if (storedInfo.version_code !== currentVersionCode) {
      debugLog.info("App version update detected", {
        oldVersion: storedInfo.version_code,
        newVersion: currentVersionCode,
      });

      const success = await sendVersionEvent(
        storedInfo.version_code,
        currentVersionCode,
      );

      saveVersionInfo({
        version_name: currentVersionName,
        version_code: currentVersionCode,
        install_event_sent: success,
        last_updated: now,
      });

      return;
    }

    // Version hasn't changed - check if we need to retry failed API call
    if (!storedInfo.install_event_sent) {
      debugLog.info("Retrying failed version tracking event");

      const success = await sendVersionEvent(
        storedInfo.version_code,
        currentVersionCode,
      );

      saveVersionInfo({
        ...storedInfo,
        install_event_sent: success,
        last_updated: now,
      });

      return;
    }

    debugLog.info("Version tracking up to date - no action needed", {
      storedVersion: storedInfo.version_code,
      currentVersion: currentVersionCode,
    });
  } catch (error) {
    debugLog.error("Error in version tracking:", error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Get current version tracking status (for debugging)
 */
export function getVersionStatus() {
  const currentVersionCode = Constants.expoConfig?.version || "1.0.0";
  const currentVersionName = Constants.expoConfig?.version || "1.0.0";

  return {
    stored: getStoredVersionInfo(),
    current: {
      version_name: currentVersionName,
      version_code: currentVersionCode,
    },
  };
}
