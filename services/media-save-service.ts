/**
 * Media Save Service
 *
 * Global service for saving images and videos to device gallery.
 * Saves to "ArChitram" album in Pictures folder.
 */

import * as MediaLibrary from "expo-media-library";

const ALBUM_NAME = "ArChitram";

const ensureMediaLibraryPermission = async (): Promise<boolean> => {
  const currentPermission = await MediaLibrary.getPermissionsAsync();
  if (currentPermission.granted) {
    return true;
  }

  if (!currentPermission.canAskAgain) {
    return false;
  }

  const requestedPermission = await MediaLibrary.requestPermissionsAsync();
  return requestedPermission.granted;
};

/**
 * Save an asset to the ArChitram album.
 *
 * Simple and reliable approach:
 * 1. Create the asset (goes to DCIM by default)
 * 2. Copy it to our album (using copyAsset=true to avoid permission issues)
 *
 * @param assetUri - The URI of the asset to save (must be a file:// URI)
 * @returns The saved asset
 */
export async function saveToArChitramAlbum(
  assetUri: string,
): Promise<MediaLibrary.Asset> {
  const hasPermission = await ensureMediaLibraryPermission();
  if (!hasPermission) {
    throw new Error("Storage permission not granted");
  }

  // Create the asset first (this always goes to default DCIM location)
  const asset = await MediaLibrary.createAssetAsync(assetUri);

  // Now add to our album
  let album = await MediaLibrary.getAlbumAsync(ALBUM_NAME);

  if (!album) {
    // No album exists - create it with this asset
    // copyAsset=true ensures it goes to Pictures/ArChitram
    album = await MediaLibrary.createAlbumAsync(ALBUM_NAME, asset, true);
  } else {
    // Album exists - add asset to it (copy, not move)
    await MediaLibrary.addAssetsToAlbumAsync([asset], album, true);
  }

  return asset;
}

/**
 * Request media library permissions
 */
export async function requestMediaPermissions(): Promise<boolean> {
  return ensureMediaLibraryPermission();
}

/**
 * Get the album name used by this service
 */
export function getAlbumName(): string {
  return ALBUM_NAME;
}
