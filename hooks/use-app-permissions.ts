import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";

/**
 * Hook to request all necessary app permissions on the home screen.
 * This centralizes the permission flow rather than asking on individual screens.
 */
export const useAppPermissions = () => {
  const hasRequested = useRef(false);

  useEffect(() => {
    if (hasRequested.current) return;

    const requestPermissions = async () => {
      hasRequested.current = true;

      try {
        // 3. Media Library (for saving/loading images and videos)
        const { status: mediaStatus } =
          await MediaLibrary.getPermissionsAsync();
        if (mediaStatus !== "granted") {
          await MediaLibrary.requestPermissionsAsync();
        }

        // 4. Camera (for creating content)
        const { status: cameraStatus } =
          await ImagePicker.getCameraPermissionsAsync();
        if (cameraStatus !== "granted") {
          await ImagePicker.requestCameraPermissionsAsync();
        }
      } catch (error) {
        console.error("Error requesting app permissions:", error);
      }
    };

    // Small delay to ensure UI is mounted and ready
    const timer = setTimeout(() => {
      requestPermissions();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);
};
