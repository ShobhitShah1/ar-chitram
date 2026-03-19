import { Image as RNImage } from "react-native";

import type { SignatureSelection } from "@/features/virtual-creativity/constants/editor-presets";
import { type VirtualLayer } from "@/features/virtual-creativity/store/virtual-creativity-store";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utils/story-frame";

const OVERLAY_MAX_WIDTH = STORY_FRAME_WIDTH * 0.44;
const OVERLAY_MAX_HEIGHT = STORY_FRAME_HEIGHT * 0.34;
const OVERLAY_MIN_WIDTH = STORY_FRAME_WIDTH * 0.18;
const OVERLAY_MIN_HEIGHT = STORY_FRAME_WIDTH * 0.18;
const SIGNATURE_BASE_FONT_SIZE = 56;
const SIGNATURE_MIN_WIDTH = STORY_FRAME_WIDTH * 0.24;
const SIGNATURE_MAX_WIDTH = STORY_FRAME_WIDTH * 0.72;
const SIGNATURE_HEIGHT = SIGNATURE_BASE_FONT_SIZE * 1.5;

const clampValue = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getImageSize = (uri: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    RNImage.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error),
    );
  });

const fitOverlaySize = (sourceWidth: number, sourceHeight: number) => {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return {
      width: OVERLAY_MAX_WIDTH,
      height: OVERLAY_MAX_WIDTH,
    };
  }

  let scale = Math.min(
    OVERLAY_MAX_WIDTH / sourceWidth,
    OVERLAY_MAX_HEIGHT / sourceHeight,
  );

  let width = sourceWidth * scale;
  let height = sourceHeight * scale;

  if (width < OVERLAY_MIN_WIDTH && height < OVERLAY_MIN_HEIGHT) {
    scale = Math.max(
      OVERLAY_MIN_WIDTH / sourceWidth,
      OVERLAY_MIN_HEIGHT / sourceHeight,
    );
    width = sourceWidth * scale;
    height = sourceHeight * scale;
  }

  return {
    width: Math.round(width * 10) / 10,
    height: Math.round(height * 10) / 10,
  };
};

export const createMainImageLayer = (uri: string): VirtualLayer => ({
  id: "main-image",
  type: "image",
  uri,
  x: 0,
  y: 0,
  width: STORY_FRAME_WIDTH,
  height: STORY_FRAME_HEIGHT,
  rotation: 0,
  scale: 1,
  opacity: 1,
  zIndex: 1,
});

export const createSubImageLayer = async (
  uri: string,
  zIndex: number,
): Promise<VirtualLayer> => {
  try {
    const { width: sourceWidth, height: sourceHeight } = await getImageSize(uri);
    const { width, height } = fitOverlaySize(sourceWidth, sourceHeight);

    return {
      id: `upload-${Date.now()}-${zIndex}`,
      type: "image",
      uri,
      x: 0,
      y: 0,
      width,
      height,
      rotation: 0,
      scale: 1,
      opacity: 1,
      zIndex,
    };
  } catch {
    return {
      id: `upload-${Date.now()}-${zIndex}`,
      type: "image",
      uri,
      x: 0,
      y: 0,
      width: OVERLAY_MAX_WIDTH,
      height: OVERLAY_MAX_WIDTH,
      rotation: 0,
      scale: 1,
      opacity: 1,
      zIndex,
    };
  }
};

export const createSignatureTextLayer = (
  selection: SignatureSelection,
  zIndex: number,
): VirtualLayer => {
  const text = selection.value.trim() || "AR Chitram";
  const width = clampValue(
    Math.round(text.length * SIGNATURE_BASE_FONT_SIZE * 0.58),
    SIGNATURE_MIN_WIDTH,
    SIGNATURE_MAX_WIDTH,
  );

  return {
    id: `signature-${Date.now()}-${zIndex}`,
    type: "text",
    text,
    fontFamily: selection.fontFamily,
    fontSize: SIGNATURE_BASE_FONT_SIZE,
    color: "#111111",
    x: 0,
    y: 0,
    width,
    height: SIGNATURE_HEIGHT,
    rotation: 0,
    scale: 1,
    opacity: 1,
    zIndex,
  };
};

export const getVirtualLayerRenderMetrics = (
  layer: Pick<VirtualLayer, "width" | "height">,
  stageScale: number,
  referenceWidth = STORY_FRAME_WIDTH,
  referenceHeight = STORY_FRAME_HEIGHT,
) => ({
  width: layer.width * stageScale,
  height: layer.height * stageScale,
  baseLeft: ((referenceWidth - layer.width) / 2) * stageScale,
  baseTop: ((referenceHeight - layer.height) / 2) * stageScale,
});
