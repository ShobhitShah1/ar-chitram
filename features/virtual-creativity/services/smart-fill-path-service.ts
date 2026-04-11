import * as ImageManipulator from "expo-image-manipulator";
import {
  getSmartFillMask,
  prepareSmartFillLookup,
  type SmartFillPreparedLookup,
} from "smart-fill-segmentation";

import { mapLayerPointToSmartFillSpace } from "@/features/virtual-creativity/services/smart-fill-layout";
import { normalizeStoryImageUri } from "@/services/story-media-service";
import { sanitizeSvgPathData } from "@/services/svg-path-utils";

const DEFAULT_SMART_FILL_TOLERANCE = 10;
const MAX_NORMALIZED_IMAGE_CACHE_ENTRIES = 20;
const MAX_PREPARED_LOOKUP_CACHE_ENTRIES = 24;

export interface SmartFillSpace {
  width: number;
  height: number;
}

export interface SmartFillRegion extends SmartFillSpace {
  path: string;
  regionTransform?: string;
  touchesEdge?: boolean;
}

interface PrimeSmartFillLookupOptions {
  imageUri: string;
  tolerance?: number;
}

interface ResolveSmartFillRegionOptions extends PrimeSmartFillLookupOptions {
  layerWidth: number;
  layerHeight: number;
  x: number;
  y: number;
}

const normalizedImageUriCache = new Map<string, Promise<string>>();
const normalizedImageUriValueCache = new Map<string, string>();
const preparedLookupCache = new Map<string, Promise<SmartFillPreparedLookup>>();
const preparedLookupValueCache = new Map<string, SmartFillPreparedLookup>();

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const setMapValueWithLimit = <T>(
  map: Map<string, T>,
  key: string,
  value: T,
  limit: number,
) => {
  if (map.has(key)) {
    map.delete(key);
  }

  map.set(key, value);

  while (map.size > limit) {
    const oldestKey = map.keys().next().value as string | undefined;
    if (!oldestKey) {
      break;
    }
    map.delete(oldestKey);
  }
};

const getTolerance = (tolerance?: number) =>
  typeof tolerance === "number" ? tolerance : DEFAULT_SMART_FILL_TOLERANCE;

const getPreparedLookupKey = (imageUri: string, tolerance: number) =>
  `${imageUri}::${tolerance}`;

const sanitizeRegionPath = (pathData: string) => sanitizeSvgPathData(pathData);

const ensureLocalImageUri = async (imageUri: string): Promise<string> => {
  const cachedValue = normalizedImageUriValueCache.get(imageUri);
  if (cachedValue) {
    return cachedValue;
  }

  let pendingValue = normalizedImageUriCache.get(imageUri);
  if (!pendingValue) {
    pendingValue = normalizeStoryImageUri(imageUri, {
      compress: 1,
      format: ImageManipulator.SaveFormat.PNG,
    });

    setMapValueWithLimit(
      normalizedImageUriCache,
      imageUri,
      pendingValue,
      MAX_NORMALIZED_IMAGE_CACHE_ENTRIES,
    );
  }

  try {
    const normalizedUri = await pendingValue;
    setMapValueWithLimit(
      normalizedImageUriValueCache,
      imageUri,
      normalizedUri,
      MAX_NORMALIZED_IMAGE_CACHE_ENTRIES,
    );
    return normalizedUri;
  } catch (error) {
    normalizedImageUriCache.delete(imageUri);
    throw error;
  }
};

const ensurePreparedLookup = async (
  imageUri: string,
  tolerance: number,
): Promise<SmartFillPreparedLookup> => {
  const lookupKey = getPreparedLookupKey(imageUri, tolerance);
  const cachedLookup = preparedLookupValueCache.get(lookupKey);
  if (cachedLookup) {
    return cachedLookup;
  }

  let pendingLookup = preparedLookupCache.get(lookupKey);
  if (!pendingLookup) {
    pendingLookup = (async () => {
      const localFileUri = await ensureLocalImageUri(imageUri);
      return prepareSmartFillLookup({
        imageUri: localFileUri,
        tolerance,
      });
    })();

    setMapValueWithLimit(
      preparedLookupCache,
      lookupKey,
      pendingLookup,
      MAX_PREPARED_LOOKUP_CACHE_ENTRIES,
    );
  }

  try {
    const preparedLookup = await pendingLookup;
    setMapValueWithLimit(
      preparedLookupValueCache,
      lookupKey,
      preparedLookup,
      MAX_PREPARED_LOOKUP_CACHE_ENTRIES,
    );
    return preparedLookup;
  } catch (error) {
    preparedLookupCache.delete(lookupKey);
    throw error;
  }
};

interface ResolvedPreparedRegion {
  path: string;
  touchesEdge: boolean;
}

const resolvePreparedRegionPath = (
  lookup: SmartFillPreparedLookup,
  x: number,
  y: number,
): ResolvedPreparedRegion => {
  const clampedX = clamp(Math.round(x), 0, lookup.width - 1);
  const clampedY = clamp(Math.round(y), 0, lookup.height - 1);

  const row = lookup.rows[clampedY] ?? [];
  for (let index = 0; index < row.length; index += 3) {
    const startX = row[index];
    const endXExclusive = row[index + 1];
    const regionId = row[index + 2];

    if (clampedX >= startX && clampedX < endXExclusive) {
      const regionKey = String(regionId);
      return {
        path: lookup.regionPaths[regionKey] ?? "",
        touchesEdge: lookup.regionTouchesEdge[regionKey] ?? false,
      };
    }
  }

  const maxRadius = Math.max(
    10,
    Math.min(28, Math.round(Math.max(lookup.width, lookup.height) / 70)),
  );
  let bestRegionId: number | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let radius = 1; radius <= maxRadius; radius += 1) {
    const minY = Math.max(0, clampedY - radius);
    const maxY = Math.min(lookup.height - 1, clampedY + radius);
    const radiusSquared = radius * radius;

    for (let currentY = minY; currentY <= maxY; currentY += 1) {
      const scanRow = lookup.rows[currentY] ?? [];
      for (let index = 0; index < scanRow.length; index += 3) {
        const startX = scanRow[index];
        const endXExclusive = scanRow[index + 1];
        const regionId = scanRow[index + 2];

        let dx = 0;
        if (clampedX < startX) {
          dx = startX - clampedX;
        } else if (clampedX >= endXExclusive) {
          dx = clampedX - (endXExclusive - 1);
        }

        const dy = Math.abs(currentY - clampedY);
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared > radiusSquared) {
          continue;
        }

        const regionKey = String(regionId);
        const size = lookup.regionPixelCounts[regionKey] ?? 999999;
        const touchesEdge = lookup.regionTouchesEdge[regionKey] ?? false;
        const score =
          distanceSquared * 1000000 +
          (touchesEdge ? 25000 : 0) +
          Math.min(size, 200000);

        if (score < bestScore) {
          bestScore = score;
          bestRegionId = regionId;
        }
      }
    }

    if (bestRegionId !== null) {
      const regionKey = String(bestRegionId);
      return {
        path: lookup.regionPaths[regionKey] ?? "",
        touchesEdge: lookup.regionTouchesEdge[regionKey] ?? false,
      };
    }
  }

  const firstRegionId = Object.keys(lookup.regionPaths)[0];
  return {
    path: firstRegionId ? lookup.regionPaths[firstRegionId] : "",
    touchesEdge: firstRegionId
      ? (lookup.regionTouchesEdge[firstRegionId] ?? false)
      : false,
  };
};

export const primeSmartFillLookup = async ({
  imageUri,
  tolerance,
}: PrimeSmartFillLookupOptions): Promise<SmartFillSpace> => {
  const lookup = await ensurePreparedLookup(imageUri, getTolerance(tolerance));
  return {
    width: lookup.width,
    height: lookup.height,
  };
};

export const primeSmartFillLookups = async (
  imageUris: string[],
  tolerance?: number,
): Promise<string[]> => {
  const uniqueUris = Array.from(new Set(imageUris.filter(Boolean)));
  if (uniqueUris.length === 0) {
    return [];
  }

  const resolvedTolerance = getTolerance(tolerance);
  const concurrency = Math.min(2, uniqueUris.length);
  let nextIndex = 0;
  const primedUris: string[] = [];

  const worker = async () => {
    while (nextIndex < uniqueUris.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const uri = uniqueUris[currentIndex];
      try {
        await ensurePreparedLookup(uri, resolvedTolerance);
        primedUris.push(uri);
      } catch {
        // Skip failed image and continue preloading others.
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return primedUris;
};

export const resolveSmartFillRegion = async ({
  imageUri,
  tolerance,
  layerWidth,
  layerHeight,
  x,
  y,
}: ResolveSmartFillRegionOptions): Promise<SmartFillRegion | null> => {
  const resolvedTolerance = getTolerance(tolerance);
  const lookup = await ensurePreparedLookup(imageUri, resolvedTolerance);
  const mappedPoint = mapLayerPointToSmartFillSpace(
    x,
    y,
    lookup.width,
    lookup.height,
    layerWidth,
    layerHeight,
  );

  if (!mappedPoint) {
    return null;
  }

  const resolved = resolvePreparedRegionPath(
    lookup,
    mappedPoint.x,
    mappedPoint.y,
  );
  const preparedPath = sanitizeRegionPath(resolved.path);
  if (preparedPath) {
    return {
      path: preparedPath,
      width: lookup.width,
      height: lookup.height,
      regionTransform: mappedPoint.regionTransform,
      touchesEdge: resolved.touchesEdge,
    };
  }

  const localFileUri = await ensureLocalImageUri(imageUri);
  const fallbackPath = sanitizeRegionPath(
    await getSmartFillMask({
      imageUri: localFileUri,
      startX: mappedPoint.x,
      startY: mappedPoint.y,
      tolerance: resolvedTolerance,
    }),
  );

  if (!fallbackPath) {
    return null;
  }

  return {
    path: fallbackPath,
    width: lookup.width,
    height: lookup.height,
    regionTransform: mappedPoint.regionTransform,
  };
};

export const resolveCachedSmartFillRegion = ({
  imageUri,
  tolerance,
  layerWidth,
  layerHeight,
  x,
  y,
}: ResolveSmartFillRegionOptions): SmartFillRegion | null => {
  const lookupKey = getPreparedLookupKey(imageUri, getTolerance(tolerance));
  const lookup = preparedLookupValueCache.get(lookupKey);
  if (!lookup) {
    return null;
  }

  const mappedPoint = mapLayerPointToSmartFillSpace(
    x,
    y,
    lookup.width,
    lookup.height,
    layerWidth,
    layerHeight,
  );

  if (!mappedPoint) {
    return null;
  }

  const resolved = resolvePreparedRegionPath(
    lookup,
    mappedPoint.x,
    mappedPoint.y,
  );
  const preparedPath = sanitizeRegionPath(resolved.path);
  if (!preparedPath) {
    return null;
  }

  return {
    path: preparedPath,
    width: lookup.width,
    height: lookup.height,
    regionTransform: mappedPoint.regionTransform,
    touchesEdge: resolved.touchesEdge,
  };
};

export const checkPointTouchesEdge = (
  imageUri: string,
  layerWidth: number,
  layerHeight: number,
  x: number,
  y: number,
  tolerance?: number,
): boolean => {
  const lookupKey = getPreparedLookupKey(imageUri, getTolerance(tolerance));
  const lookup = preparedLookupValueCache.get(lookupKey);
  if (!lookup) {
    return false;
  }

  const mappedPoint = mapLayerPointToSmartFillSpace(
    x,
    y,
    lookup.width,
    lookup.height,
    layerWidth,
    layerHeight,
  );

  if (!mappedPoint) {
    return false;
  }

  const resolved = resolvePreparedRegionPath(
    lookup,
    mappedPoint.x,
    mappedPoint.y,
  );
  return resolved.touchesEdge;
};

export const getSmartFillErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    if (
      error.message.includes("TurboModule") ||
      error.message.includes("NativeModule") ||
      error.message.includes("SourceCode")
    ) {
      return "Smart fill requires a rebuilt native app.";
    }

    if (error.message.toLowerCase().includes("path")) {
      return "Smart fill returned an invalid path. Please try a nearby area.";
    }

    return error.message;
  }

  return "Smart fill failed.";
};
