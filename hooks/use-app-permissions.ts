import { useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "expo-router";
import * as MediaLibrary from "expo-media-library";
import { InteractionManager, Alert, Linking } from "react-native";
import { useCallback } from "react";

/**
 * Automatically request app permissions every time a screen gains focus
 * until granted or blocked.
 * Used on entry screens like Home to ensure the app has necessary rights.
 */
export const useAppPermissions = () => {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        if (!cameraPermission || !mediaPermission) {
          return;
        }

        void (async () => {
          try {
            // Request Camera if not granted and can still ask
            if (!cameraPermission.granted) {
              if (cameraPermission.canAskAgain) {
                await requestCameraPermission();
              }
            }

            // Request Media if not granted and can still ask
            if (!mediaPermission.granted) {
              if (mediaPermission.canAskAgain) {
                await requestMediaPermission();
              }
            }
          } catch (error) {
            console.error("Error requesting app permissions:", error);
          }
        })();
      });

      return () => {
        task.cancel();
      };
    }, [
      cameraPermission,
      mediaPermission,
      requestCameraPermission,
      requestMediaPermission,
    ]),
  );

  const openSettings = () => {
    void Linking.openSettings();
  };

  return {
    cameraPermission,
    mediaPermission,
    openSettings,
  };
};
