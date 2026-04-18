import { Image as RNImage } from "react-native";

import type { SignatureSelection } from "@/features/virtual-creativity/constants/editor-presets";
import { type VirtualLayer } from "@/features/virtual-creativity/store/virtual-creativity-store";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utils/story-frame";

const OVERLAY_MAX_WIDTH = STORY_FRAME_WIDTH * 0.44;
const OVERLAY_MAX_HEIGHT = STORY_FRAME_HEIGHT * 0.34;
const OVERLAY_MIN_WIDTH = STORY_FRAME_WIDTH * 0.18;
const OVERLAY_MIN_HEIGHT = STORY_FRAME_WIDTH * 0.18;
const SIGNATURE_BASE_FONT_SIZE = 56;
const SIGNATURE_MIN_WIDTH = STORY_FRAME_WIDTH * 0.28;
const SIGNATURE_MAX_WIDTH = STORY_FRAME_WIDTH * 0.92;
const SIGNATURE_HEIGHT = SIGNATURE_BASE_FONT_SIZE * 2.5;
const SIGNATURE_WIDTH_MULTIPLIER = 1.05;
const SIGNATURE_HORIZONTAL_PADDING = 60;

const clampValue = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getImageSize = (uri: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timeout"));
    }, 400);

    RNImage.getSize(
      uri,
      (width, height) => {
        clearTimeout(timeout);
        resolve({ width, height });
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
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
  existingLayers: VirtualLayer[] = [],
): Promise<VirtualLayer> => {
  try {
    const { width: sourceWidth, height: sourceHeight } =
      await getImageSize(uri);
    const { width, height } = fitOverlaySize(sourceWidth, sourceHeight);

    const pos = findNonOverlappingPosition(width, height, existingLayers);

    return {
      id: `upload-${Date.now()}-${zIndex}`,
      type: "image",
      uri,
      x: pos.x,
      y: pos.y,
      width,
      height,
      rotation: 0,
      scale: 1,
      opacity: 1,
      zIndex,
    };
  } catch {
    const width = OVERLAY_MAX_WIDTH;
    const height = OVERLAY_MAX_WIDTH;
    const pos = findNonOverlappingPosition(width, height, existingLayers);

    return {
      id: `upload-${Date.now()}-${zIndex}`,
      type: "image",
      uri,
      x: pos.x,
      y: pos.y,
      width,
      height,
      rotation: 0,
      scale: 1,
      opacity: 1,
      zIndex,
    };
  }
};

const SIGNATURE_EDITOR_MARGIN = 60;

export const createSignatureTextLayer = (
  selection: SignatureSelection,
  zIndex: number,
  existingLayers: VirtualLayer[] = [],
): VirtualLayer => {
  const text = selection.value.trim() || "AR Chitram";
  const width = clampValue(
    Math.round(
      text.length * SIGNATURE_BASE_FONT_SIZE * SIGNATURE_WIDTH_MULTIPLIER +
        SIGNATURE_HORIZONTAL_PADDING * 2,
    ),
    SIGNATURE_MIN_WIDTH,
    SIGNATURE_MAX_WIDTH,
  );

  const height = SIGNATURE_HEIGHT;
  const pos = findNonOverlappingPosition(width, height, existingLayers);

  return {
    id: `signature-${Date.now()}-${zIndex}`,
    type: "text",
    text,
    fontFamily: selection.fontFamily,
    fontSize: SIGNATURE_BASE_FONT_SIZE,
    color: "#111111",
    x: pos.x || (STORY_FRAME_WIDTH - width - 2 * SIGNATURE_EDITOR_MARGIN) / 2,
    y: pos.y || (STORY_FRAME_HEIGHT - height - 2 * SIGNATURE_EDITOR_MARGIN) / 2,
    width,
    height,
    rotation: 0,
    scale: 1,
    opacity: 1,
    zIndex,
  };
};

export const findNonOverlappingPosition = (
  width: number,
  height: number,
  existingLayers: VirtualLayer[],
  canvasWidth: number = STORY_FRAME_WIDTH,
  canvasHeight: number = STORY_FRAME_HEIGHT,
): { x: number; y: number } => {
  const overlays = existingLayers.filter(
    (l) => l.id !== "main-image" && l.type !== "drawing",
  );
  if (overlays.length === 0) return { x: 0, y: 0 };

  const checkOverlap = (
    x1: number,
    y1: number,
    w1: number,
    h1: number,
    x2: number,
    y2: number,
    w2: number,
    h2: number,
  ) => {
    const margin = 10; // Tighter margin for efficient packing
    return (
      Math.abs(x1 - x2) < (w1 + w2) / 2 + margin &&
      Math.abs(y1 - y2) < (h1 + h2) / 2 + margin
    );
  };

  const isPositionValid = (x: number, y: number) => {
    // Canvas containment check (relative to center)
    const padding = 16;
    const maxX = (canvasWidth - width - padding) / 2;
    const maxY = (canvasHeight - height - padding) / 2;

    if (Math.abs(x) > maxX || Math.abs(y) > maxY) return false;

    // Layer overlap check
    for (const layer of overlays) {
      const layerW = (layer.width || 0) * (layer.scale || 1);
      const layerH = (layer.height || 0) * (layer.scale || 1);
      if (checkOverlap(x, y, width, height, layer.x, layer.y, layerW, layerH)) {
        return false;
      }
    }
    return true;
  };

  // 1. Try Dead Center First (User preference for focus)
  if (isPositionValid(0, 0)) return { x: 0, y: 0 };

  // 2. Comprehensive Grid Search (Checking the WHOLE View)
  const gridPoints: { x: number; y: number }[] = [];
  const gridCount = 10; // 10x10 Grid = 100 potential spots across whole screen

  for (let r = 0; r < gridCount; r++) {
    for (let c = 0; c < gridCount; c++) {
      // Calculate coord relative to center
      const tx = (canvasWidth / gridCount) * (c + 0.5) - canvasWidth / 2;
      const ty = (canvasHeight / gridCount) * (r + 0.5) - canvasHeight / 2;

      // Check if this box physically fits inside the screen first
      const maxX = (canvasWidth - width - 10) / 2;
      const maxY = (canvasHeight - height - 10) / 2;
      if (Math.abs(tx) <= maxX && Math.abs(ty) <= maxY) {
        gridPoints.push({ x: tx, y: ty });
      }
    }
  }

  // 3. Shuffle Grid Points for "Random" Feel Across Whole View
  // Using a simple modern Fisher-Yates shuffle
  for (let i = gridPoints.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [gridPoints[i], gridPoints[j]] = [gridPoints[j], gridPoints[i]];
  }

  // 4. Return First Empty Spot Found
  for (const point of gridPoints) {
    if (isPositionValid(point.x, point.y)) {
      return { x: Math.round(point.x), y: Math.round(point.y) };
    }
  }

  // Final fallback (slightly randomized center to allow manual adjustment)
  return {
    x: (Math.random() - 0.5) * 60,
    y: (Math.random() - 0.5) * 60,
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
