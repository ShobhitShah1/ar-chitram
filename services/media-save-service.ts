/**
 * Media Save Service
 *
 * Global service for saving images and videos to device gallery.
 * Saves to "ArChitram" album in Pictures folder.
 */

import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";

const ALBUM_NAME = "ArChitram";
const PHOTO_MEDIA_PERMISSIONS: MediaLibrary.GranularPermission[] = ["photo"];
const PHOTO_VIDEO_MEDIA_PERMISSIONS: MediaLibrary.GranularPermission[] = [
  "photo",
  "video",
];

const ensureMediaLibraryPermission = async (
  granularPermissions: MediaLibrary.GranularPermission[] = PHOTO_MEDIA_PERMISSIONS,
): Promise<boolean> => {
  const currentPermission = await MediaLibrary.getPermissionsAsync(
    false,
    granularPermissions,
  );
  if (currentPermission.granted) {
    return true;
  }

  if (!currentPermission.canAskAgain) {
    return false;
  }

  let requestedPermission = await MediaLibrary.requestPermissionsAsync(
    false,
    granularPermissions,
  );
  if (!requestedPermission.granted && requestedPermission.canAskAgain) {
    requestedPermission = await MediaLibrary.requestPermissionsAsync(
      true,
      granularPermissions,
    );
  }
  return requestedPermission.granted;
};

/**
 * Save an asset to the ArChitram album.
 *
 * Simple and reliable approach:
 * 1. Ensure file exists and is a local URI
 * 2. Create the asset (goes to DCIM/Pictures by default)
 * 3. Copy it to our album (using copyAsset=true to avoid permission issues)
 * 4. Verify the asset was created
 *
 * @param assetUri - The URI of the asset to save (must be a local file URI)
 * @returns The saved asset
 */
export async function saveToArChitramAlbum(
  assetUri: string,
  granularPermissions: MediaLibrary.GranularPermission[] = PHOTO_MEDIA_PERMISSIONS,
): Promise<MediaLibrary.Asset> {
  console.log(`[MediaSaveService] Starting save for: ${assetUri}`);

  // Basic validation
  if (!assetUri) {
    throw new Error("No asset URI provided");
  }

  // Ensure it's a local file (expo-media-library requires local files)
  if (!assetUri.startsWith("file://") && !assetUri.startsWith("/")) {
    console.warn(
      `[MediaSaveService] URI might not be a local file: ${assetUri}. Attempting to save anyway.`,
    );
  }

  const hasPermission = await ensureMediaLibraryPermission(granularPermissions);
  if (!hasPermission) {
    console.error("[MediaSaveService] Storage permission not granted");
    throw new Error("Storage permission not granted");
  }

  // 1. Verify existence if possible
  try {
    const fileInfo = await FileSystem.getInfoAsync(assetUri);
    if (!fileInfo.exists) {
      console.error(`[MediaSaveService] File doesn't exist at: ${assetUri}`);
      throw new Error("Source file does not exist. Cannot save to gallery.");
    }
  } catch (e) {
    console.warn(`[MediaSaveService] Existence check failed: ${e}`);
    // Non-fatal, try anyway
  }

  try {
    // 2. Create the asset first (this always goes to default DCIM location)
    const asset = await MediaLibrary.createAssetAsync(assetUri);

    if (!asset) {
      throw new Error("Failed to create media asset");
    }

    console.log(`[MediaSaveService] Asset created: ${asset.id}`);

    // 2. Now try to add to our album
    try {
      let album = await MediaLibrary.getAlbumAsync(ALBUM_NAME);

      if (!album) {
        // No album exists - create it with this asset
        // copyAsset=true ensures it goes to Pictures/ArChitram and creates the folder if needed
        console.log(`[MediaSaveService] Creating new album: ${ALBUM_NAME}`);
        album = await MediaLibrary.createAlbumAsync(ALBUM_NAME, asset, true);
        console.log(`[MediaSaveService] Album created successfully`);
      } else {
        // Album exists - add asset to it (copy, not move, to be safe with permissions)
        console.log(
          `[MediaSaveService] Adding asset to existing album: ${ALBUM_NAME}`,
        );
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, true);
        console.log(`[MediaSaveService] Asset added to album successfully`);
      }
    } catch (albumError) {
      // If album creation/addition fails, we still have the asset in the main library
      console.warn(
        `[MediaSaveService] Failed to add to album "${ALBUM_NAME}", but asset was created in main library.`,
        albumError,
      );
    }

    return asset;
  } catch (error) {
    console.error(`[MediaSaveService] Error saving asset:`, error);
    throw error;
  }
}

/**
 * Request media library permissions
 */
export async function requestMediaPermissions(): Promise<boolean> {
  return ensureMediaLibraryPermission(PHOTO_MEDIA_PERMISSIONS);
}

export async function requestVideoMediaPermissions(): Promise<boolean> {
  return ensureMediaLibraryPermission(PHOTO_VIDEO_MEDIA_PERMISSIONS);
}

/**
 * Get the album name used by this service
 */
export function getAlbumName(): string {
  return ALBUM_NAME;
}
