// Centralized asset URL utility for different image types
const ASSETS_BASE_URL =
  "https://nirvanatechlabs.in/ar_chitram_backend/gigglam_image";

// New admin base URL for banners and assets
const ADMIN_BASE_URL = "https://nirvanatechlabs.in/ar_chitram_admin/uploads";
const TAB_ASSETS_BASE_URL = "https://nirvanatechlabs.in/ARChitramAdmin";

// Asset types and their directory mappings
export enum AssetType {
  PROFILE = "profile_image",
  CONTEST = "contest_image",
  BANNER = "banners",
  ASSET = "assets",
  BACKGROUND = "background",
}

export enum TabAssetType {
  COLOR = "color_image",
  DRAWING = "drawing_image",
  SKETCH = "sketch_image",
  CONTEST = "contest",
}

// Asset directory mappings
const ASSET_DIRECTORIES: Record<AssetType, string> = {
  [AssetType.PROFILE]: "profile_image",
  [AssetType.CONTEST]: "contest_image",
  [AssetType.BANNER]: "banners",
  [AssetType.ASSET]: "assets",
  [AssetType.BACKGROUND]: "background",
};

/**
 * Generates the full URL for an asset
 * @param assetType - Type of asset (profile, contest, etc.)
 * @param filename - The filename returned from API
 * @returns Complete asset URL or undefined if filename is not provided
 */
export const getAssetUrl = (
  assetType: AssetType,
  filename?: string,
): string | undefined => {
  if (!filename) return undefined;

  const directory = ASSET_DIRECTORIES[assetType];
  return `${ASSETS_BASE_URL}/${directory}/${filename}`;
};

/**
 * Convenience function for profile images
 * @param filename - Profile image filename
 * @returns Complete profile image URL or undefined
 */
export const getProfileImageUrl = (filename?: string): string | undefined => {
  return getAssetUrl(AssetType.PROFILE, filename);
};

/**
 * Convenience function for contest images
 * @param filename - Contest image filename
 * @returns Complete contest image URL or undefined
 */
export const getContestImageUrl = (filename?: string): string | undefined => {
  return getAssetUrl(AssetType.CONTEST, filename);
};

/**
 * Convenience function for banner images (Admin URL)
 * @param filename - Banner image filename
 * @returns Complete banner image URL or undefined
 */
export const getBannerImageUrl = (filename?: string): string | undefined => {
  if (!filename) return undefined;
  return `${ADMIN_BASE_URL}/${AssetType.BANNER}/${filename}`;
};

/**
 * Convenience function for asset images (Admin URL)
 * @param filename - Asset image filename
 * @returns Complete asset image URL or undefined
 */
export const getAssetImageUrl = (filename?: string): string | undefined => {
  if (!filename) return undefined;
  return `${ADMIN_BASE_URL}/${AssetType.ASSET}/${filename}`;
};

/**
 * Convenience function for background removal asset images (Admin URL)
 * @param filename - Background asset image filename
 * @returns Complete background asset image URL or undefined
 */
export const getBackgroundAssetUrl = (
  filename?: string,
): string | undefined => {
  if (!filename) return undefined;
  return `${ADMIN_BASE_URL}/${AssetType.BACKGROUND}/${filename}`;
};

/**
 * Generic URL builder for API tab assets (colors, drawing, sketch, contest)
 */
export const getTabAssetUrl = (
  tabAssetType: TabAssetType,
  filename?: string,
): string | undefined => {
  if (!filename) return undefined;
  return `${TAB_ASSETS_BASE_URL}/${tabAssetType}/${filename}`;
};

export const getColorAssetUrl = (filename?: string): string | undefined =>
  getTabAssetUrl(TabAssetType.COLOR, filename);

export const getDrawingAssetUrl = (filename?: string): string | undefined =>
  getTabAssetUrl(TabAssetType.DRAWING, filename);

export const getSketchAssetUrl = (filename?: string): string | undefined =>
  getTabAssetUrl(TabAssetType.SKETCH, filename);

export const getContestTabAssetUrl = (filename?: string): string | undefined =>
  getTabAssetUrl(TabAssetType.CONTEST, filename);

/**
 * Processes profile image URL to ensure it's a valid remote URL
 * @param imageUrl - Raw image URL (could be local file path, remote URL, or filename)
 * @returns Remote URL or null if invalid
 */
export const processProfileImageUrl = (
  imageUrl?: string | null,
): string | null => {
  if (!imageUrl) return null;

  // If it's already a full HTTP URL, return as is
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  // If it's a local file path (file:// or contains local paths), return null
  if (
    imageUrl.startsWith("file://") ||
    imageUrl.includes("/data/user/") ||
    imageUrl.includes("/cache/") ||
    imageUrl.includes("ImagePicker")
  ) {
    console.warn("Local image path detected, should use remote URL:", imageUrl);
    return null;
  }

  // Assume it's a filename and construct remote URL
  return getProfileImageUrl(imageUrl) || null;
};
