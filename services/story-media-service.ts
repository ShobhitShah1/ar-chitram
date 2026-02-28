import { CameraView } from "expo-camera";

import {
  NormalizeStoryImageOptions,
  normalizeImageToStoryFrame,
} from "@/services/story-image-service";
import { isLocalAssetUri } from "@/utiles/story-frame";

interface StoryCaptureOptions extends NormalizeStoryImageOptions {
  quality?: number;
}

export const normalizeStoryImageUri = async (
  imageUri: string,
  options: NormalizeStoryImageOptions = {},
): Promise<string> => {
  try {
    const normalized = await normalizeImageToStoryFrame(imageUri, options);
    return normalized.uri;
  } catch (error) {
    console.warn("Failed to normalize story image", error);
    return imageUri;
  }
};

export const normalizeLocalStoryImageUri = async (
  imageUri: string,
  options: NormalizeStoryImageOptions = {},
): Promise<string> => {
  if (!isLocalAssetUri(imageUri)) {
    return imageUri;
  }

  return normalizeStoryImageUri(imageUri, options);
};

export const takeNormalizedStoryPicture = async (
  camera: CameraView | null,
  options: StoryCaptureOptions = {},
): Promise<string | null> => {
  if (!camera) {
    return null;
  }

  const photo = await camera.takePictureAsync({
    quality: options.quality ?? 0.85,
  });

  if (!photo?.uri) {
    return null;
  }

  const hasNormalizationOptions =
    typeof options.targetWidth === "number" ||
    typeof options.targetHeight === "number" ||
    typeof options.compress !== "undefined" ||
    typeof options.format !== "undefined";

  if (!hasNormalizationOptions) {
    return photo.uri;
  }

  return normalizeStoryImageUri(photo.uri, {
    compress: options.compress,
    format: options.format,
    targetWidth: options.targetWidth,
    targetHeight: options.targetHeight,
    fit: options.fit,
  });
};
