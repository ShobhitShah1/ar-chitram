import { setApiDeviceHeader } from "@/services/api-service";
import DeviceInfo from "react-native-device-info";
import { storage } from "./storage";

const DEVICE_ID_KEY = "@device_unique_id";

export const getDeviceId = async (): Promise<string> => {
  try {
    // First, try to get the stored UUID from MMKV
    const storedId = storage.getString(DEVICE_ID_KEY);
    if (storedId) {
      setApiDeviceHeader(storedId);
      return storedId;
    }

    // If no stored ID, try to get device unique ID
    let deviceId = await DeviceInfo.getUniqueId();

    // If getUniqueId returns a generic ID, generate a custom one
    if (!deviceId || deviceId === "unknown" || deviceId.length < 8) {
      deviceId = await generateFallbackId();
    }

    // Store the device ID for future use in MMKV
    storage.setString(DEVICE_ID_KEY, deviceId);
    setApiDeviceHeader(deviceId);

    return deviceId;
  } catch (error) {
    console.error("Error getting device ID:", error);
    // Fallback to a generated ID
    return await generateFallbackId();
  }
};

/**
 * Generate a fallback unique ID when device ID is not available
 */
const generateFallbackId = async (): Promise<string> => {
  try {
    // Combine multiple device properties to create a unique ID
    const [brand, model, systemVersion, buildId, androidId] = await Promise.all(
      [
        DeviceInfo.getBrand(),
        DeviceInfo.getModel(),
        DeviceInfo.getSystemVersion(),
        DeviceInfo.getBuildId().catch(() => "unknown"),
        DeviceInfo.getAndroidId().catch(() => "unknown"),
      ]
    );

    // Create a hash-like string from device properties
    const deviceString = `${brand}-${model}-${systemVersion}-${buildId}-${androidId}-${Date.now()}`;

    // Simple hash function to create a shorter ID
    let hash = 0;
    for (let i = 0; i < deviceString.length; i++) {
      const char = deviceString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    // Convert to positive number and add random component
    const uniqueId =
      Math.abs(hash).toString(16) + Math.random().toString(16).substr(2, 8);

    return uniqueId;
  } catch (error) {
    console.error("Error generating fallback ID:", error);
    // Ultimate fallback - timestamp + random
    return Date.now().toString(16) + Math.random().toString(16).substr(2, 8);
  }
};

/**
 * Reset the stored device ID (useful for testing or if you want to generate a new ID)
 */
export const resetDeviceId = (): void => {
  try {
    storage.removeItem(DEVICE_ID_KEY);
  } catch (error) {
    console.error("Error resetting device ID:", error);
  }
};

/**
 * Get device information for debugging
 */
export const getDeviceInfo = async () => {
  try {
    const deviceId = await getDeviceId();
    const [brand, model, systemName, systemVersion, uniqueId] =
      await Promise.all([
        DeviceInfo.getBrand(),
        DeviceInfo.getModel(),
        DeviceInfo.getSystemName(),
        DeviceInfo.getSystemVersion(),
        DeviceInfo.getUniqueId().catch(() => "unavailable"),
      ]);

    return {
      deviceId,
      brand,
      model,
      systemName,
      systemVersion,
      uniqueId,
    };
  } catch (error) {
    console.error("Error getting device info:", error);
    return {
      deviceId: await getDeviceId(),
      brand: "unknown",
      model: "unknown",
      systemName: "unknown",
      systemVersion: "unknown",
      uniqueId: "unavailable",
    };
  }
};
