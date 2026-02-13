import { debugLog } from "@/constants/debug";
import { useProfile } from "@/context/profile-context";
import { useUser } from "@/context/user-context";
import { clearApiAuthToken, clearAuthCache } from "@/services/api-service";
import { getFromSecureStore } from "@/utiles/secure-storage";
import { storage } from "@/utiles/storage";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

export const useAuth = () => {
  const router = useRouter();
  const { setUserData, logout: userLogout } = useUser();
  const { clearProfile } = useProfile();

  const queryClient = useQueryClient();

  const login = async ({
    phoneNumber,
    userName,
  }: {
    phoneNumber: string;
    userName: string;
  }) => {
    debugLog.info("User login initiated", { phoneNumber, userName });

    // Get existing userId from both storages (prefer secure storage)
    const secureUserId = await getFromSecureStore("userId");
    const regularUserId = storage.getString("@userId");
    const userId = secureUserId || regularUserId || "";

    debugLog.info("UserId sources", {
      secureUserId: !!secureUserId,
      regularUserId: !!regularUserId,
      finalUserId: userId,
    });

    // Store user data locally
    storage.setString("@username", userName);
    storage.setString("@phoneNumber", phoneNumber);
    if (userId) {
      storage.setString("@userId", userId);
    }

    // Set user context with userId, name, and phoneNumber
    await setUserData(userName, userId, phoneNumber);

    debugLog.info("Login data stored", { userName, userId, phoneNumber });

    // Note: Navigation is now handled by the calling component
  };

  const logout = async () => {
    debugLog.info(
      "User logout initiated - clearing user data while preserving theme",
    );

    try {
      // Clear API auth token and cache FIRST to stop ongoing requests
      clearApiAuthToken();
      clearAuthCache();
      debugLog.info("API auth token and cache cleared");

      // Cancel all ongoing React Query requests
      await queryClient.cancelQueries();
      debugLog.info("All ongoing API requests cancelled");

      // Clear React Query cache
      queryClient.clear();
      debugLog.info("React Query cache cleared");

      // Clear User Data, Local Storage, and IAP Store via UserContext
      await userLogout();
      debugLog.info("User context and IAP store cleared");

      // Clear profile context
      clearProfile();
      debugLog.info("Profile context cleared");

      // Navigate to login
      router.replace("/(auth)/login");
      debugLog.info("Navigated to login screen");
    } catch (error) {
      debugLog.error("Error during logout", error);
      // Still navigate to login even if there's an error
      router.replace("/(auth)/login");
    }
  };

  return {
    login,
    logout,
    isLoggingIn: false,
  };
};
