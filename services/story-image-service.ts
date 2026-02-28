import * as ImageManipulator from "expo-image-manipulator";
import { Image as RNImage } from "react-native";

import {
  STORY_FRAME_ASPECT_RATIO,
  STORY_FRAME_HEIGHT,
  STORY_FRAME_WIDTH,
} from "@/utiles/story-frame";

export interface NormalizeStoryImageOptions {
  targetWidth?: number;
  targetHeight?: number;
  compress?: number;
  format?: ImageManipulator.SaveFormat;
  fit?: "contain" | "cover";
}

export interface NormalizeStoryImageResult {
  uri: string;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
}

const getImageSize = (uri: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    RNImage.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error),
    );
  });

export const normalizeImageToStoryFrame = async (
  sourceUri: string,
  options: NormalizeStoryImageOptions = {},
): Promise<NormalizeStoryImageResult> => {
  const sourceSize = await getImageSize(sourceUri);
  const sourceWidth = Math.max(1, Math.round(sourceSize.width));
  const sourceHeight = Math.max(1, Math.round(sourceSize.height));
  const shouldResize =
    typeof options.targetWidth === "number" &&
    typeof options.targetHeight === "number";

  const targetWidth = shouldResize
    ? Math.max(1, Math.round(options.targetWidth ?? STORY_FRAME_WIDTH))
    : sourceWidth;
  const targetHeight = shouldResize
    ? Math.max(1, Math.round(options.targetHeight ?? STORY_FRAME_HEIGHT))
    : sourceHeight;
  const targetRatio = targetWidth / targetHeight || STORY_FRAME_ASPECT_RATIO;
  const fitMode = options.fit ?? "contain";

  const sourceRatio = sourceWidth / sourceHeight;

  let cropX = 0;
  let cropY = 0;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  let outputWidth = sourceWidth;
  let outputHeight = sourceHeight;

  if (shouldResize && fitMode === "cover" && Math.abs(sourceRatio - targetRatio) > 0.0001) {
    if (sourceRatio > targetRatio) {
      // Source is wider than target ratio: crop left/right.
      cropWidth = Math.max(1, Math.round(sourceHeight * targetRatio));
      cropX = Math.max(0, Math.round((sourceWidth - cropWidth) / 2));
    } else {
      // Source is taller than target ratio: crop top/bottom.
      cropHeight = Math.max(1, Math.round(sourceWidth / targetRatio));
      cropY = Math.max(0, Math.round((sourceHeight - cropHeight) / 2));
    }
  }

  if (shouldResize) {
    if (fitMode === "contain") {
      const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
      outputWidth = Math.max(1, Math.round(sourceWidth * scale));
      outputHeight = Math.max(1, Math.round(sourceHeight * scale));
    } else {
      outputWidth = targetWidth;
      outputHeight = targetHeight;
    }
  }

  const actions: ImageManipulator.Action[] = [];

  if (
    cropX !== 0 ||
    cropY !== 0 ||
    cropWidth !== sourceWidth ||
    cropHeight !== sourceHeight
  ) {
    actions.push({
      crop: {
        originX: cropX,
        originY: cropY,
        width: cropWidth,
        height: cropHeight,
      },
    });
  }

  if (outputWidth !== cropWidth || outputHeight !== cropHeight) {
    actions.push({
      resize: {
        width: outputWidth,
        height: outputHeight,
      },
    });
  }

  if (
    actions.length === 0 &&
    typeof options.compress === "undefined" &&
    typeof options.format === "undefined"
  ) {
    return {
      uri: sourceUri,
      width: sourceWidth,
      height: sourceHeight,
      sourceWidth,
      sourceHeight,
    };
  }

  const result = await ImageManipulator.manipulateAsync(sourceUri, actions, {
    compress: options.compress ?? 1,
    format: options.format ?? ImageManipulator.SaveFormat.JPEG,
  });

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    sourceWidth,
    sourceHeight,
  };
};
