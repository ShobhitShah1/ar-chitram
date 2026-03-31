import { useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "expo-router";
import * as MediaLibrary from "expo-media-library";
import { InteractionManager } from "react-native";
import { useCallback, useRef } from "react";

/**
 * Automatically request app permissions once when a screen first gains focus.
 * Used on entry screens so camera-driven flows do not surprise the user later.
 */
export const useAppPermissions = () => {
  const hasRequested = useRef(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        if (hasRequested.current) {
          return;
        }

        if (!cameraPermission || !mediaPermission) {
          return;
        }

        hasRequested.current = true;

        void (async () => {
          try {
            if (!cameraPermission.granted && cameraPermission.canAskAgain) {
              await requestCameraPermission();
            }

            if (!mediaPermission.granted && mediaPermission.canAskAgain) {
              await requestMediaPermission();
            }
          } catch (error) {
            console.error("Error requesting app permissions:", error);
            hasRequested.current = false;
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

  return {
    cameraPermission,
    mediaPermission,
  };
};
