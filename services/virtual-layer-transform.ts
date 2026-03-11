export const MIN_LAYER_SCALE = 0.2;
export const MAX_LAYER_SCALE = 2.6;
export const LAYER_BOUNDARY_PADDING = 0;

interface MaxFitScaleParams {
  canvasHeight: number;
  canvasWidth: number;
  layerHeight: number;
  layerWidth: number;
}

interface ClampAxisParams {
  canvasSize: number;
  layerSize: number;
  maxFitScale: number;
  nextPosition: number;
  nextScale: number;
  padding?: number;
}

interface DisplayFrameParams {
  baseHeight: number;
  baseLeft: number;
  baseTop: number;
  baseWidth: number;
  scale: number;
  stageScale: number;
  translateX: number;
  translateY: number;
}

interface ResizeDeltaParams {
  canvasHeight: number;
  canvasWidth: number;
  currentZoom: number;
  direction: number;
  rawDelta: number;
  stageScale: number;
  divisor?: number;
}

export const clampValue = (value: number, min: number, max: number) => {
  "worklet";
  return Math.max(min, Math.min(max, value));
};

export const getMaxFitScale = ({
  canvasHeight,
  canvasWidth,
  layerHeight,
  layerWidth,
}: MaxFitScaleParams) =>
  Math.max(
    MIN_LAYER_SCALE,
    Math.min(
      MAX_LAYER_SCALE,
      canvasWidth / Math.max(layerWidth, 1),
      canvasHeight / Math.max(layerHeight, 1),
    ),
  );

export const clampLayerAxisPosition = ({
  canvasSize,
  layerSize,
  maxFitScale,
  nextPosition,
  nextScale,
  padding = LAYER_BOUNDARY_PADDING,
}: ClampAxisParams) => {
  "worklet";
  const fittedScale = Math.min(nextScale, maxFitScale);
  const halfSize = (layerSize * fittedScale) / 2;
  const center = canvasSize / 2 + nextPosition;
  const minCenter = padding + halfSize;
  const maxCenter = canvasSize - padding - halfSize;

  return clampValue(center, minCenter, maxCenter) - canvasSize / 2;
};

export const getLayerDisplayFrame = ({
  baseHeight,
  baseLeft,
  baseTop,
  baseWidth,
  scale,
  stageScale,
  translateX,
  translateY,
}: DisplayFrameParams) => {
  "worklet";
  const displayWidth = baseWidth * scale;
  const displayHeight = baseHeight * scale;

  return {
    height: displayHeight,
    left: baseLeft + translateX * stageScale - (displayWidth - baseWidth) / 2,
    top: baseTop + translateY * stageScale - (displayHeight - baseHeight) / 2,
    width: displayWidth,
  };
};

export const getResizeScaleDelta = ({
  canvasHeight,
  canvasWidth,
  currentZoom,
  direction,
  rawDelta,
  stageScale,
  divisor = 2.8,
}: ResizeDeltaParams) => {
  "worklet";
  const resizeReferenceSize =
    Math.min(canvasWidth, canvasHeight) * stageScale * currentZoom;

  return (direction * rawDelta) / Math.max(resizeReferenceSize * divisor, 1);
};