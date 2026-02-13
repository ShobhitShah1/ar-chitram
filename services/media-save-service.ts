/**
 * Media Save Service
 *
 * Global service for saving images and videos to device gallery.
 * Saves to "Gigglam" album in Pictures folder.
 */

import * as MediaLibrary from "expo-media-library";

const ALBUM_NAME = "Gigglam";

/**
 * Save an asset to the Gigglam album.
 *
 * Simple and reliable approach:
 * 1. Create the asset (goes to DCIM by default)
 * 2. Copy it to our album (using copyAsset=true to avoid permission issues)
 *
 * @param assetUri - The URI of the asset to save (must be a file:// URI)
 * @returns The saved asset
 */
export async function saveToGigglamAlbum(
  assetUri: string
): Promise<MediaLibrary.Asset> {
  // Request permissions
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Storage permission not granted");
  }

  // Create the asset first (this always goes to default DCIM location)
  const asset = await MediaLibrary.createAssetAsync(assetUri);

  // Now add to our album
  let album = await MediaLibrary.getAlbumAsync(ALBUM_NAME);

  if (!album) {
    // No album exists - create it with this asset
    // copyAsset=true ensures it goes to Pictures/Gigglam
    album = await MediaLibrary.createAlbumAsync(ALBUM_NAME, asset, true);
    console.log("Created new Gigglam album");
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
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Get the album name used by this service
 */
export function getAlbumName(): string {
  return ALBUM_NAME;
}
