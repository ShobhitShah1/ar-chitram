const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const roundValue = (value: number) => Math.round(value * 1000) / 1000;

export const getSmartFillDisplayLayout = (
  sourceWidth: number,
  sourceHeight: number,
  layerWidth: number,
  layerHeight: number,
) => {
  const scale = Math.min(layerWidth / sourceWidth, layerHeight / sourceHeight);
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;
  const offsetX = (layerWidth - renderedWidth) / 2;
  const offsetY = (layerHeight - renderedHeight) / 2;

  return {
    renderedWidth,
    renderedHeight,
    offsetX,
    offsetY,
    scale,
    transform: `matrix(${roundValue(scale)} 0 0 ${roundValue(scale)} ${roundValue(offsetX)} ${roundValue(offsetY)})`,
  };
};

export const mapLayerPointToSmartFillSpace = (
  x: number,
  y: number,
  spaceWidth: number,
  spaceHeight: number,
  layerWidth: number,
  layerHeight: number,
  allowOutside = false,
) => {
  const layout = getSmartFillDisplayLayout(
    spaceWidth,
    spaceHeight,
    layerWidth,
    layerHeight,
  );

  let localX = x - layout.offsetX;
  let localY = y - layout.offsetY;
  const isOutside =
    localX < 0 ||
    localY < 0 ||
    localX > layout.renderedWidth ||
    localY > layout.renderedHeight;

  if (isOutside && !allowOutside) {
    return null;
  }

  localX = clamp(localX, 0, layout.renderedWidth);
  localY = clamp(localY, 0, layout.renderedHeight);

  return {
    x: clamp(
      Math.round((localX / Math.max(1, layout.renderedWidth)) * spaceWidth),
      0,
      spaceWidth - 1,
    ),
    y: clamp(
      Math.round((localY / Math.max(1, layout.renderedHeight)) * spaceHeight),
      0,
      spaceHeight - 1,
    ),
    regionTransform: layout.transform,
  };
};
