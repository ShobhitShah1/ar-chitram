import { useEffect, useState } from "react";
import { notificationService } from "@/services/notification-service";
import { updateNotificationToken } from "@/services/api-service";

/**
 * Hook to handle notification token updates
 * Automatically updates FCM token on server when user is authenticated
 */
export const useNotificationToken = (userId: string | null, authInitialized: boolean) => {
  const [isUpdated, setIsUpdated] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const updateToken = async () => {
      if (authInitialized && userId && !isUpdated && !isCancelled) {
        try {
          const fcmToken = await notificationService.registerForPushNotificationsAsync();

          if (fcmToken && !isCancelled) {
            const response = await updateNotificationToken(fcmToken);

            if (!isCancelled) {
              if (response.code === 200) {
                setIsUpdated(true);
              }
            }
          } else if (!isCancelled) {
            console.warn("⚠️ No FCM token obtained");
          }
        } catch (error) {
          if (!isCancelled) {
            console.error("❌ Failed to update notification token:", error);
          }
        }
      }
    };

    updateToken();

    return () => {
      isCancelled = true;
    };
  }, [authInitialized, userId, isUpdated]);

  return isUpdated;
};
