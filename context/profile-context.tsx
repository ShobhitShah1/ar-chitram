import { getProfile, updateProfile } from "@/services/api-service";
import { getAuthToken, getAuthUserId } from "@/store/auth-store";
import { getProfileImageUrl } from "@/utiles/asset-url";
import { getFromSecureStore, saveToSecureStore } from "@/utiles/secure-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface ProfileData {
  name: string;
  profile_image: string | null;
}

interface ProfileContextType {
  // Profile data
  profileData: ProfileData | null;
  isLoading: boolean;
  error: string | null;

  // Profile actions
  fetchProfile: () => Promise<ProfileData | null>;
  updateProfileData: (imageUri: string, name: string) => Promise<boolean>;
  clearProfile: () => void;

  // Helper methods
  getImageURL: () => string | null;
  getUserName: () => string;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
};

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (): Promise<ProfileData | null> => {
    try {
      const token = getAuthToken();
      const userId = getAuthUserId();

      if (!token || !userId) {
        return null;
      }

      setIsLoading(true);
      setError(null);

      const response = await getProfile();

      if (response && response.code === 200 && response.data) {
        const profileData: ProfileData = {
          name: response.data.name || "",
          profile_image: response.data.profile_image || null,
        };

        setProfileData(profileData);

        await saveToSecureStore("profileData", JSON.stringify(profileData));

        return profileData;
      } else {
        throw new Error(response?.message || "Failed to fetch profile");
      }
    } catch (error: any) {
      console.error("❌ Error fetching profile:", error);
      setError(error.message || "Failed to fetch profile");

      // Try to load cached data
      await loadCachedProfile();
      return profileData; // Return the cached data if available
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfileData = async (
    imageUri: string,
    name: string,
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await updateProfile(imageUri, name);

      if (result.success) {
        const updatedProfile: ProfileData = {
          name: name.trim(),
          profile_image: result.data?.profile_image || imageUri,
        };

        setProfileData(updatedProfile);

        await saveToSecureStore("profileData", JSON.stringify(updatedProfile));

        return true;
      } else {
        throw new Error(result.message || "Failed to update profile");
      }
    } catch (error: any) {
      console.error("❌ Error updating profile:", error);
      setError(error.message || "Failed to update profile");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loadCachedProfile = async () => {
    try {
      const cachedData = await getFromSecureStore("profileData");
      if (cachedData) {
        const parsed: ProfileData = JSON.parse(cachedData);
        setProfileData(parsed);
      }
    } catch (error) {
      console.error("Error loading cached profile:", error);
    }
  };

  const clearProfile = () => {
    setProfileData(null);
    setError(null);
  };

  const getImageURL = (): string | null => {
    if (!profileData?.profile_image) return null;

    if (profileData.profile_image.startsWith("http")) {
      return profileData.profile_image;
    }

    return getProfileImageUrl?.(profileData.profile_image) || null;
  };

  const getUserName = (): string => {
    return profileData?.name || "";
  };

  // TODO: enable this when we have a proper API

  // useEffect(() => {
  //   let timeoutId = setTimeout(() => {
  //     fetchProfile();
  //   }, 500);

  //   return () => clearTimeout(timeoutId);
  // }, []);

  const value: ProfileContextType = {
    profileData,
    isLoading,
    error,
    fetchProfile,
    updateProfileData,
    clearProfile,
    getImageURL,
    getUserName,
  };

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
};
