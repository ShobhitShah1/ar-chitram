import { mapLayerPointToSmartFillSpace } from "@/features/virtual-creativity/services/smart-fill-layout";
import { DrawingPath } from "@/features/virtual-creativity/store/virtual-creativity-store";

interface Point {
  x: number;
  y: number;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface FlattenedPath {
  points: Point[];
  closed: boolean;
  bounds: Bounds;
}

interface Matrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

const TOKEN_REGEX = /[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g;
const CURVE_SAMPLE_STEPS = 12;
const IDENTITY_MATRIX: Matrix = {
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
};

const flattenedPathCache = new Map<string, FlattenedPath>();
const transformedPathCache = new Map<string, FlattenedPath>();
const matrixCache = new Map<string, Matrix>();

const isFilledBrushPath = (drawingPath: DrawingPath) =>
  drawingPath.brushKind === "smart-fill" ||
  (drawingPath.brushKind === "pattern" &&
    !!drawingPath.patternUri &&
    drawingPath.strokeWidth <= 0);

const createBounds = (): Bounds => ({
  minX: Number.POSITIVE_INFINITY,
  minY: Number.POSITIVE_INFINITY,
  maxX: Number.NEGATIVE_INFINITY,
  maxY: Number.NEGATIVE_INFINITY,
});

const includePointInBounds = (bounds: Bounds, point: Point) => {
  bounds.minX = Math.min(bounds.minX, point.x);
  bounds.minY = Math.min(bounds.minY, point.y);
  bounds.maxX = Math.max(bounds.maxX, point.x);
  bounds.maxY = Math.max(bounds.maxY, point.y);
};

const finalizeBounds = (bounds: Bounds): Bounds => {
  if (!Number.isFinite(bounds.minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  return bounds;
};

const isCommandToken = (token?: string) => !!token && /^[a-zA-Z]$/.test(token);

const sampleQuadratic = (
  start: Point,
  control: Point,
  end: Point,
  steps = CURVE_SAMPLE_STEPS,
) => {
  const sampled: Point[] = [];

  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const inverse = 1 - t;
    sampled.push({
      x:
        inverse * inverse * start.x +
        2 * inverse * t * control.x +
        t * t * end.x,
      y:
        inverse * inverse * start.y +
        2 * inverse * t * control.y +
        t * t * end.y,
    });
  }

  return sampled;
};

const sampleCubic = (
  start: Point,
  control1: Point,
  control2: Point,
  end: Point,
  steps = CURVE_SAMPLE_STEPS,
) => {
  const sampled: Point[] = [];

  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const inverse = 1 - t;
    sampled.push({
      x:
        inverse * inverse * inverse * start.x +
        3 * inverse * inverse * t * control1.x +
        3 * inverse * t * t * control2.x +
        t * t * t * end.x,
      y:
        inverse * inverse * inverse * start.y +
        3 * inverse * inverse * t * control1.y +
        3 * inverse * t * t * control2.y +
        t * t * t * end.y,
    });
  }

  return sampled;
};

const flattenSvgPath = (pathData: string): FlattenedPath => {
  const cached = flattenedPathCache.get(pathData);
  if (cached) {
    return cached;
  }

  const tokens = pathData.match(TOKEN_REGEX) ?? [];
  const points: Point[] = [];
  const bounds = createBounds();

  let index = 0;
  let command = "";
  let current: Point = { x: 0, y: 0 };
  let subpathStart: Point = { x: 0, y: 0 };
  let closed = false;

  const addPoint = (point: Point) => {
    points.push(point);
    includePointInBounds(bounds, point);
    current = point;
  };

  const readNumber = () => {
    const token = tokens[index];
    index += 1;
    return Number.parseFloat(token);
  };

  while (index < tokens.length) {
    const nextToken = tokens[index];
    if (isCommandToken(nextToken)) {
      command = nextToken!;
      index += 1;
      if (command === "Z" || command === "z") {
        addPoint({ ...subpathStart });
        closed = true;
        continue;
      }
    }

    switch (command) {
      case "M":
      case "m": {
        let firstPair = true;
        while (index < tokens.length && !isCommandToken(tokens[index])) {
          const rawX = readNumber();
          const rawY = readNumber();
          const point =
            command === "m"
              ? { x: current.x + rawX, y: current.y + rawY }
              : { x: rawX, y: rawY };

          if (firstPair) {
            addPoint(point);
            subpathStart = point;
            firstPair = false;
          } else {
            addPoint(point);
          }
        }
        break;
      }
      case "L":
      case "l": {
        while (index < tokens.length && !isCommandToken(tokens[index])) {
          const rawX = readNumber();
          const rawY = readNumber();
          addPoint(
            command === "l"
              ? { x: current.x + rawX, y: current.y + rawY }
              : { x: rawX, y: rawY },
          );
        }
        break;
      }
      case "H":
      case "h": {
        while (index < tokens.length && !isCommandToken(tokens[index])) {
          const rawX = readNumber();
          addPoint(
            command === "h"
              ? { x: current.x + rawX, y: current.y }
              : { x: rawX, y: current.y },
          );
        }
        break;
      }
      case "V":
      case "v": {
        while (index < tokens.length && !isCommandToken(tokens[index])) {
          const rawY = readNumber();
          addPoint(
            command === "v"
              ? { x: current.x, y: current.y + rawY }
              : { x: current.x, y: rawY },
          );
        }
        break;
      }
      case "Q":
      case "q": {
        while (index < tokens.length && !isCommandToken(tokens[index])) {
          const c1x = readNumber();
          const c1y = readNumber();
          const endX = readNumber();
          const endY = readNumber();
          const control =
            command === "q"
              ? { x: current.x + c1x, y: current.y + c1y }
              : { x: c1x, y: c1y };
          const end =
            command === "q"
              ? { x: current.x + endX, y: current.y + endY }
              : { x: endX, y: endY };

          for (const point of sampleQuadratic(current, control, end)) {
            addPoint(point);
          }
        }
        break;
      }
      case "C":
      case "c": {
        while (index < tokens.length && !isCommandToken(tokens[index])) {
          const c1x = readNumber();
          const c1y = readNumber();
          const c2x = readNumber();
          const c2y = readNumber();
          const endX = readNumber();
          const endY = readNumber();
          const control1 =
            command === "c"
              ? { x: current.x + c1x, y: current.y + c1y }
              : { x: c1x, y: c1y };
          const control2 =
            command === "c"
              ? { x: current.x + c2x, y: current.y + c2y }
              : { x: c2x, y: c2y };
          const end =
            command === "c"
              ? { x: current.x + endX, y: current.y + endY }
              : { x: endX, y: endY };

          for (const point of sampleCubic(current, control1, control2, end)) {
            addPoint(point);
          }
        }
        break;
      }
      default: {
        index += 1;
        break;
      }
    }
  }

  const flattened: FlattenedPath = {
    points,
    closed,
    bounds: finalizeBounds(bounds),
  };

  flattenedPathCache.set(pathData, flattened);
  return flattened;
};

const parseMatrixTransform = (transform?: string): Matrix => {
  if (!transform) {
    return IDENTITY_MATRIX;
  }

  const cached = matrixCache.get(transform);
  if (cached) {
    return cached;
  }

  const match = /matrix\(([^)]+)\)/.exec(transform);
  if (!match) {
    matrixCache.set(transform, IDENTITY_MATRIX);
    return IDENTITY_MATRIX;
  }

  const values = match[1]
    .split(/[ ,]+/)
    .map((value) => Number.parseFloat(value))
    .filter((value) => Number.isFinite(value));

  if (values.length !== 6) {
    matrixCache.set(transform, IDENTITY_MATRIX);
    return IDENTITY_MATRIX;
  }

  const matrix: Matrix = {
    a: values[0],
    b: values[1],
    c: values[2],
    d: values[3],
    e: values[4],
    f: values[5],
  };

  matrixCache.set(transform, matrix);
  return matrix;
};

const transformPoint = (point: Point, matrix: Matrix): Point => ({
  x: matrix.a * point.x + matrix.c * point.y + matrix.e,
  y: matrix.b * point.x + matrix.d * point.y + matrix.f,
});

const getTransformedPath = (
  pathData: string,
  transform?: string,
): FlattenedPath => {
  if (!transform) {
    return flattenSvgPath(pathData);
  }

  const cacheKey = `${pathData}::${transform}`;
  const cached = transformedPathCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const base = flattenSvgPath(pathData);
  const matrix = parseMatrixTransform(transform);
  const bounds = createBounds();
  const points = base.points.map((point) => {
    const nextPoint = transformPoint(point, matrix);
    includePointInBounds(bounds, nextPoint);
    return nextPoint;
  });

  const transformed: FlattenedPath = {
    points,
    closed: base.closed,
    bounds: finalizeBounds(bounds),
  };

  transformedPathCache.set(cacheKey, transformed);
  return transformed;
};

const getDistanceToSegmentSquared = (
  point: Point,
  start: Point,
  end: Point,
) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    const px = point.x - start.x;
    const py = point.y - start.y;
    return px * px + py * py;
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) /
        (dx * dx + dy * dy),
    ),
  );

  const projectionX = start.x + t * dx;
  const projectionY = start.y + t * dy;
  const px = point.x - projectionX;
  const py = point.y - projectionY;
  return px * px + py * py;
};

const getMinDistanceSquaredToPolyline = (point: Point, points: Point[]) => {
  if (points.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  if (points.length === 1) {
    const dx = point.x - points[0].x;
    const dy = point.y - points[0].y;
    return dx * dx + dy * dy;
  }

  let minDistance = Number.POSITIVE_INFINITY;

  for (let index = 1; index < points.length; index += 1) {
    minDistance = Math.min(
      minDistance,
      getDistanceToSegmentSquared(point, points[index - 1], points[index]),
    );
  }

  return minDistance;
};

const isPointWithinBounds = (point: Point, bounds: Bounds, padding: number) =>
  point.x >= bounds.minX - padding &&
  point.x <= bounds.maxX + padding &&
  point.y >= bounds.minY - padding &&
  point.y <= bounds.maxY + padding;

const isPointInsidePolygon = (point: Point, points: Point[]) => {
  if (points.length < 3) {
    return false;
  }

  let isInside = false;

  for (
    let index = 0, previous = points.length - 1;
    index < points.length;
    previous = index, index += 1
  ) {
    const currentPoint = points[index];
    const previousPoint = points[previous];

    const intersects =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y || 1e-9) +
          currentPoint.x;

    if (intersects) {
      isInside = !isInside;
    }
  }

  return isInside;
};

export const doesDrawingPathHitPoint = (
  drawingPath: DrawingPath,
  point: Point,
  radius: number,
  layerWidth: number,
  layerHeight: number,
) => {
  if (!drawingPath.path) {
    return false;
  }

  const isImageSpacePath =
    drawingPath.pathSpace === "image" &&
    !!drawingPath.pathSpaceWidth &&
    !!drawingPath.pathSpaceHeight;

  if (isImageSpacePath) {
    const mappedPoint = mapLayerPointToSmartFillSpace(
      point.x,
      point.y,
      drawingPath.pathSpaceWidth!,
      drawingPath.pathSpaceHeight!,
      layerWidth,
      layerHeight,
    );

    if (!mappedPoint) {
      return false;
    }

    if (isFilledBrushPath(drawingPath)) {
      const filledPath = flattenSvgPath(drawingPath.path);

      if (!isPointWithinBounds(mappedPoint, filledPath.bounds, radius)) {
        return false;
      }

      if (isPointInsidePolygon(mappedPoint, filledPath.points)) {
        return true;
      }

      return (
        getMinDistanceSquaredToPolyline(mappedPoint, filledPath.points) <=
        radius * radius
      );
    }

    const strokePath = flattenSvgPath(drawingPath.path);
    const threshold = Math.max(
      radius,
      drawingPath.strokeWidth * 0.5 + radius * 0.4,
    );

    if (drawingPath.clipPath) {
      const clipPath = flattenSvgPath(drawingPath.clipPath);
      if (!isPointWithinBounds(mappedPoint, clipPath.bounds, threshold)) {
        return false;
      }

      const distanceToClip = getMinDistanceSquaredToPolyline(
        mappedPoint,
        clipPath.points,
      );
      if (
        !isPointInsidePolygon(mappedPoint, clipPath.points) &&
        distanceToClip > threshold * threshold
      ) {
        return false;
      }
    }

    if (!isPointWithinBounds(mappedPoint, strokePath.bounds, threshold)) {
      return false;
    }

    return (
      getMinDistanceSquaredToPolyline(mappedPoint, strokePath.points) <=
      threshold * threshold
    );
  }

  if (isFilledBrushPath(drawingPath)) {
    const filledPath = getTransformedPath(
      drawingPath.path,
      drawingPath.regionTransform,
    );

    if (!isPointWithinBounds(point, filledPath.bounds, radius)) {
      return false;
    }

    if (isPointInsidePolygon(point, filledPath.points)) {
      return true;
    }

    return (
      getMinDistanceSquaredToPolyline(point, filledPath.points) <=
      radius * radius
    );
  }

  const strokePath = flattenSvgPath(drawingPath.path);
  const threshold = Math.max(
    radius,
    drawingPath.strokeWidth * 0.5 + radius * 0.4,
  );

  if (!isPointWithinBounds(point, strokePath.bounds, threshold)) {
    return false;
  }

  return (
    getMinDistanceSquaredToPolyline(point, strokePath.points) <=
    threshold * threshold
  );
};
