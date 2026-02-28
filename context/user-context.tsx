import { storage } from "@/utiles/storage";
import { useAuthStore } from "@/store/auth-store";
import {
  getProfile,
  addSkuToProfile,
  clearApiAuthToken,
} from "@/services/api-service";
import { processProfileImageUrl } from "@/utiles/asset-url";
import { debugLog } from "@/constants/debug";
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";

interface UserContextType {
  userName: string;
  userId: string;
  phoneNumber: string | null;
  profileImage: string | null;
  isLoadingPhoneNumber: boolean;
  setUserName: (name: string) => void;
  setUserId: (id: string) => void;
  setPhoneNumber: (phone: string | null) => void;
  setProfileImage: (image: string | null) => void;
  setUserData: (
    name: string,
    id: string,
    phone?: string | null,
    profileImg?: string | null,
  ) => Promise<void>;
  purchasedSkus: string[];
  syncProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [userName, setUserName] = useState(
    storage.getString("@username") || "",
  );
  const [userId, setUserId] = useState(storage.getString("@userId") || "");
  const [purchasedSkus, setPurchasedSkus] = useState<string[]>(() => {
    try {
      const stored = storage.getString("@purchasedSkus");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [phoneNumber, setPhoneNumber] = useState<string | null>(
    storage.getString("@phoneNumber") || null,
  );
  const [profileImage, setProfileImage] = useState<string | null>(
    storage.getString("@profileImage") || null,
  );
  const [isLoadingPhoneNumber, setIsLoadingPhoneNumber] = useState(false);

  useEffect(() => {
    let timeoutId = setTimeout(() => {
      initializeUserData();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, []);

  const initializeUserData = async () => {
    try {
      const authUserId = useAuthStore.getState().user?.id || "";
      const regularUserId = storage.getString("@userId");
      const finalUserId = authUserId || regularUserId || "";

      const regularUserName = storage.getString("@username") || "";
      const regularPhoneNumber = storage.getString("@phoneNumber") || null;
      const regularProfileImage = storage.getString("@profileImage") || null;

      if (finalUserId !== userId) {
        setUserId(finalUserId);
        if (authUserId && authUserId !== regularUserId) {
          storage.setString("@userId", authUserId);
        }
      }

      if (regularUserName !== userName) {
        setUserName(regularUserName);
      }

      if (regularPhoneNumber !== phoneNumber) {
        setPhoneNumber(regularPhoneNumber);
      }

      const processedProfileImage = processProfileImageUrl(regularProfileImage);
      if (processedProfileImage !== profileImage) {
        setProfileImage(processedProfileImage);
        if (processedProfileImage) {
          storage.setString("@profileImage", processedProfileImage);
        } else {
          storage.removeItem("@profileImage");
        }
      }
    } catch (error) {
      console.error("Error initializing user data:", error);
    }
  };

  const updateUserName = (name: string) => {
    setUserName(name);

    if (name) {
      storage.setString("@username", name);
    } else {
      storage.removeItem("@username");
    }
  };

  const updateUserId = async (id: string) => {
    setUserId(id);

    if (id) {
      storage.setString("@userId", id);
    } else {
      storage.removeItem("@userId");
    }
  };

  const updatePhoneNumber = (phone: string | null) => {
    setPhoneNumber(phone);

    if (phone) {
      storage.setString("@phoneNumber", phone);
    } else {
      storage.removeItem("@phoneNumber");
    }
  };

  const updateProfileImage = (image: string | null) => {
    const processedImage = processProfileImageUrl(image);
    setProfileImage(processedImage);

    if (processedImage) {
      storage.setString("@profileImage", processedImage);
    } else {
      storage.removeItem("@profileImage");
    }
  };

  const logout = async () => {
    debugLog.info("[USER] Logging out and clearing data...");

    // 1. Clear State
    setUserName("");
    setUserId("");
    setPhoneNumber(null);
    setProfileImage(null);
    setPurchasedSkus([]);

    useAuthStore.getState().clearAuthSession();
    clearApiAuthToken();
    debugLog.info("[USER] Data cleared.");
  };

  const updateUserData = async (
    name: string,
    id: string,
    phone?: string | null,
    profileImg?: string | null,
  ) => {
    // If switching users (id matches different user), we should clear first
    const currentStoredId = storage.getString("@userId");
    if (currentStoredId && currentStoredId !== id) {
      await logout();
    }

    updateUserName(name);
    await updateUserId(id);
    if (phone !== undefined) {
      updatePhoneNumber(phone);
    }
    if (profileImg !== undefined) {
      updateProfileImage(profileImg);
    }
    // Refresh profile including SKUs when user data is updated/logged in
    setTimeout(() => syncProfile(), 100);
  };

  const syncProfile = async () => {
    try {
      debugLog.info("[PAYMENT] Syncing profile...");
      const response = await getProfile();
      if (response && response.data && Array.isArray(response.data.SKU)) {
        const validSkus = response.data.SKU.filter(
          (sku): sku is string => typeof sku === "string" && sku !== null,
        );
        debugLog.info("[PAYMENT] Valid SKUs found:", validSkus);
        setPurchasedSkus(validSkus);
        storage.setString("@purchasedSkus", JSON.stringify(validSkus));
      } else {
        debugLog.info("[PAYMENT] No SKUs found in profile response");
        // Don't clear local cache if API returns nothing but success, unless empty array explicitly?
        // If response.data.SKU is empty array, we should probably clear it.
        if (
          response &&
          response.data &&
          Array.isArray(response.data.SKU) &&
          response.data.SKU.length === 0
        ) {
          setPurchasedSkus([]);
          storage.removeItem("@purchasedSkus");
        }
      }
    } catch (error) {
      console.error("Failed to sync profile SKUs:", error);
      debugLog.error("[PAYMENT] Failed to sync profile SKUs", error);
    }
  };

  const unlockSku = async (sku: string): Promise<boolean> => {
    try {
      debugLog.info(`[PAYMENT] Unlocking SKU locally and on server: ${sku}`);
      const response = await addSkuToProfile(sku);
      if (response.code === 200) {
        setPurchasedSkus((prev) => {
          if (prev.includes(sku)) return prev;
          debugLog.info(`[PAYMENT] SKU unlocked locally: ${sku}`);
          const newSkus = [...prev, sku];
          storage.setString("@purchasedSkus", JSON.stringify(newSkus));
          return newSkus;
        });
        return true;
      }
      debugLog.error(
        `[PAYMENT] Failed to unlock SKU (API error): ${response.message}`,
      );
      return false;
    } catch (error) {
      console.error(`Failed to unlock SKU ${sku}:`, error);
      debugLog.error(`[PAYMENT] Failed to unlock SKU (Exception):`, error);
      return false;
    }
  };

  const revokeSku = (sku: string) => {
    setPurchasedSkus((prev) => {
      if (!prev.includes(sku)) return prev;
      debugLog.info(`[PAYMENT] Revoking SKU locally: ${sku}`);
      const newSkus = prev.filter((s) => s !== sku);
      storage.setString("@purchasedSkus", JSON.stringify(newSkus));
      return newSkus;
    });
  };

  const isSkuLocked = (sku: string): boolean => {
    // If we have no SKUs yet and functionality relies on it,
    // we might want to default to locked or handle loading state.
    // Here we strictly check if it's in the list.
    return !purchasedSkus.includes(sku);
  };

  return (
    <UserContext.Provider
      value={{
        userName,
        userId,
        phoneNumber,
        profileImage,
        isLoadingPhoneNumber,
        setUserName: updateUserName,
        setUserId: updateUserId,
        setPhoneNumber: updatePhoneNumber,
        setProfileImage: updateProfileImage,
        setUserData: updateUserData,
        purchasedSkus,
        syncProfile,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
