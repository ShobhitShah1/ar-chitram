import { storage } from "@/utils/storage";

const LIKED_CONTEST_IMAGES_STORAGE_KEY = "@ArChitram/liked_contest_images";

export type LikedContestImagesMap = Record<string, boolean>;

export const getLikedContestImages = (): LikedContestImagesMap => {
  try {
    const stored = storage.getString(LIKED_CONTEST_IMAGES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as LikedContestImagesMap;
    }
  } catch (error) {
    console.warn("Failed to load liked contest images from storage:", error);
  }

  return {};
};

export const saveLikedContestImages = (likedImages: LikedContestImagesMap) => {
  try {
    storage.setString(
      LIKED_CONTEST_IMAGES_STORAGE_KEY,
      JSON.stringify(likedImages),
    );
  } catch (error) {
    console.warn("Failed to save liked contest images to storage:", error);
  }
};
