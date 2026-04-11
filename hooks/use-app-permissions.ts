import { useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "expo-router";
import * as MediaLibrary from "expo-media-library";
import { InteractionManager, Linking } from "react-native";
import { useCallback } from "react";

/**
 * Automatically request app permissions every time a screen gains focus
 * until granted or blocked.
 * Used on entry screens like Home to ensure the app has necessary rights.
 */
export const useAppPermissions = () => {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const requestMediaPermission = useCallback(async () => {
    const current = await MediaLibrary.getPermissionsAsync(false, ["photo"]);
    if (current.granted) {
      return current;
    }

    if (!current.canAskAgain) {
      return current;
    }

    let requested = await MediaLibrary.requestPermissionsAsync(false, [
      "photo",
    ]);
    if (!requested.granted && requested.canAskAgain) {
      requested = await MediaLibrary.requestPermissionsAsync(true, ["photo"]);
    }

    return requested;
  }, []);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        if (!cameraPermission) {
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

            await requestMediaPermission();
          } catch (error) {
            console.error("Error requesting app permissions:", error);
          }
        })();
      });

      return () => {
        task.cancel();
      };
    }, [cameraPermission, requestCameraPermission, requestMediaPermission]),
  );

  const openSettings = () => {
    void Linking.openSettings();
  };

  return {
    cameraPermission,
    requestMediaPermission,
    openSettings,
  };
};
