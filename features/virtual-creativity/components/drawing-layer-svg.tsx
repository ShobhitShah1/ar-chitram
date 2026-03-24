import React from "react";
import { StyleSheet } from "react-native";
import Svg, {
  ClipPath,
  Defs,
  Image as SvgImage,
  Path,
  Pattern,
} from "react-native-svg";

import { sanitizeSvgPathData } from "@/services/svg-path-utils";
import { DrawingPath } from "@/features/virtual-creativity/store/virtual-creativity-store";

const PATTERN_TILE_SIZE = 60;

interface DrawingLayerSvgProps {
  idPrefix: string;
  paths: DrawingPath[];
  layerWidth: number;
  layerHeight: number;
  strokeScale?: number;
  minimumStrokeWidth?: number;
}

interface ImageSpaceGroup {
  key: string;
  width: number;
  height: number;
  paths: DrawingPath[];
}

const getScaledStrokeWidth = (
  strokeWidth: number,
  strokeScale: number,
  minimumStrokeWidth: number,
) => Math.max(minimumStrokeWidth, strokeWidth * strokeScale);

const sanitizeRenderablePath = (path: DrawingPath): DrawingPath | null => {
  const safePath = sanitizeSvgPathData(path.path);
  if (!safePath) {
    return null;
  }

  if (!path.clipPath) {
    return {
      ...path,
      path: safePath,
    };
  }

  const safeClipPath = sanitizeSvgPathData(path.clipPath);
  if (!safeClipPath) {
    return null;
  }

  return {
    ...path,
    path: safePath,
    clipPath: safeClipPath,
  };
};

const isFilledPaintPath = (path: DrawingPath) =>
  path.brushKind === "smart-fill" ||
  (path.brushKind === "pattern" && !!path.patternUri && path.strokeWidth <= 0);

export const DrawingLayerSvg: React.FC<DrawingLayerSvgProps> = ({
  idPrefix,
  paths,
  layerWidth,
  layerHeight,
  strokeScale = 1,
  minimumStrokeWidth = 0,
}) => {
  const layerSpacePaths = React.useMemo(() => {
    const nextPaths: DrawingPath[] = [];

    for (const path of paths) {
      if (!path.path || path.pathSpace === "image") {
        continue;
      }

      const sanitized = sanitizeRenderablePath(path);
      if (sanitized) {
        nextPaths.push(sanitized);
      }
    }

    return nextPaths;
  }, [paths]);

  const imageSpaceGroups = React.useMemo(() => {
    const groups = new Map<string, ImageSpaceGroup>();

    for (const path of paths) {
      if (
        !path.path ||
        path.pathSpace !== "image" ||
        !path.pathSpaceWidth ||
        !path.pathSpaceHeight
      ) {
        continue;
      }

      const sanitized = sanitizeRenderablePath(path);
      if (!sanitized) {
        continue;
      }

      const key = `${path.pathSpaceWidth}x${path.pathSpaceHeight}`;
      const existingGroup = groups.get(key);
      if (existingGroup) {
        existingGroup.paths.push(sanitized);
        continue;
      }

      groups.set(key, {
        key,
        width: path.pathSpaceWidth,
        height: path.pathSpaceHeight,
        paths: [sanitized],
      });
    }

    return Array.from(groups.values());
  }, [paths]);

  const renderLayerSpacePaths = () => {
    if (layerSpacePaths.length === 0) {
      return null;
    }

    const patternUris = Array.from(
      new Set(
        layerSpacePaths
          .filter((path) => path.brushKind === "pattern" && path.patternUri)
          .map((path) => path.patternUri as string),
      ),
    );
    const clipPaths = layerSpacePaths.filter((path) => !!path.clipPath);

    return (
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${layerWidth} ${layerHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {patternUris.length > 0 || clipPaths.length > 0 ? (
          <Defs>
            {patternUris.map((uri, index) => (
              <Pattern
                key={`${idPrefix}-layer-pattern-${index}`}
                id={`${idPrefix}-layer-pattern-${index}`}
                patternUnits="userSpaceOnUse"
                width={PATTERN_TILE_SIZE}
                height={PATTERN_TILE_SIZE}
              >
                <SvgImage
                  href={{ uri }}
                  x={0}
                  y={0}
                  width={PATTERN_TILE_SIZE}
                  height={PATTERN_TILE_SIZE}
                  preserveAspectRatio="xMidYMid slice"
                />
              </Pattern>
            ))}
            {clipPaths.map((path) => (
              <ClipPath
                key={`${idPrefix}-layer-clip-${path.id}`}
                id={`${idPrefix}-layer-clip-${path.id}`}
              >
                <Path d={path.clipPath!} transform={path.regionTransform} />
              </ClipPath>
            ))}
          </Defs>
        ) : null}

        {layerSpacePaths.map((path) => {
          const clipPathValue = path.clipPath
            ? `url(#${idPrefix}-layer-clip-${path.id})`
            : undefined;
          const isPattern = path.brushKind === "pattern" && path.patternUri;
          const patternIndex = isPattern
            ? patternUris.indexOf(path.patternUri!)
            : -1;

          if (isFilledPaintPath(path)) {
            if (isPattern && patternIndex >= 0) {
              return (
                <Path
                  key={path.id}
                  d={path.path}
                  transform={path.regionTransform}
                  fill={`url(#${idPrefix}-layer-pattern-${patternIndex})`}
                  clipPath={clipPathValue}
                />
              );
            }

            return (
              <Path
                key={path.id}
                d={path.path}
                transform={path.regionTransform}
                fill={path.color}
                clipPath={clipPathValue}
              />
            );
          }

          const scaledStrokeWidth = getScaledStrokeWidth(
            path.strokeWidth,
            strokeScale,
            minimumStrokeWidth,
          );

          if (isPattern && patternIndex >= 0) {
            return (
              <React.Fragment key={path.id}>
                <Path
                  d={path.path}
                  stroke={path.color || "#888"}
                  strokeWidth={scaledStrokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.35}
                  clipPath={clipPathValue}
                />
                <Path
                  d={path.path}
                  stroke={`url(#${idPrefix}-layer-pattern-${patternIndex})`}
                  strokeWidth={scaledStrokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  clipPath={clipPathValue}
                />
              </React.Fragment>
            );
          }

          return (
            <Path
              key={path.id}
              d={path.path}
              stroke={path.color}
              strokeWidth={scaledStrokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              clipPath={clipPathValue}
            />
          );
        })}
      </Svg>
    );
  };

  const renderImageSpaceGroup = (group: ImageSpaceGroup) => {
    const patternUris = Array.from(
      new Set(
        group.paths
          .filter((path) => path.brushKind === "pattern" && path.patternUri)
          .map((path) => path.patternUri as string),
      ),
    );
    const clipPaths = group.paths.filter((path) => !!path.clipPath);

    return (
      <Svg
        key={`${idPrefix}-image-space-${group.key}`}
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${group.width} ${group.height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {patternUris.length > 0 || clipPaths.length > 0 ? (
          <Defs>
            {patternUris.map((uri, index) => (
              <Pattern
                key={`${idPrefix}-image-pattern-${group.key}-${index}`}
                id={`${idPrefix}-image-pattern-${group.key}-${index}`}
                patternUnits="userSpaceOnUse"
                width={PATTERN_TILE_SIZE}
                height={PATTERN_TILE_SIZE}
              >
                <SvgImage
                  href={{ uri }}
                  x={0}
                  y={0}
                  width={PATTERN_TILE_SIZE}
                  height={PATTERN_TILE_SIZE}
                  preserveAspectRatio="xMidYMid slice"
                />
              </Pattern>
            ))}
            {clipPaths.map((path) => (
              <ClipPath
                key={`${idPrefix}-image-clip-${group.key}-${path.id}`}
                id={`${idPrefix}-image-clip-${group.key}-${path.id}`}
              >
                <Path d={path.clipPath!} />
              </ClipPath>
            ))}
          </Defs>
        ) : null}

        {group.paths.map((path) => {
          const clipPathValue = path.clipPath
            ? `url(#${idPrefix}-image-clip-${group.key}-${path.id})`
            : undefined;
          const isPattern = path.brushKind === "pattern" && path.patternUri;
          const patternIndex = isPattern
            ? patternUris.indexOf(path.patternUri!)
            : -1;

          if (isFilledPaintPath(path)) {
            if (isPattern && patternIndex >= 0) {
              return (
                <Path
                  key={path.id}
                  d={path.path}
                  fill={`url(#${idPrefix}-image-pattern-${group.key}-${patternIndex})`}
                  clipPath={clipPathValue}
                />
              );
            }

            return (
              <Path
                key={path.id}
                d={path.path}
                fill={path.color}
                clipPath={clipPathValue}
              />
            );
          }

          const scaledStrokeWidth = getScaledStrokeWidth(
            path.strokeWidth,
            strokeScale,
            minimumStrokeWidth,
          );

          if (isPattern && patternIndex >= 0) {
            return (
              <React.Fragment key={path.id}>
                <Path
                  d={path.path}
                  stroke={path.color || "#888"}
                  strokeWidth={scaledStrokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.35}
                  clipPath={clipPathValue}
                />
                <Path
                  d={path.path}
                  stroke={`url(#${idPrefix}-image-pattern-${group.key}-${patternIndex})`}
                  strokeWidth={scaledStrokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  clipPath={clipPathValue}
                />
              </React.Fragment>
            );
          }

          return (
            <Path
              key={path.id}
              d={path.path}
              stroke={path.color}
              strokeWidth={scaledStrokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              clipPath={clipPathValue}
            />
          );
        })}
      </Svg>
    );
  };

  if (paths.length === 0) {
    return null;
  }

  return (
    <>
      {renderLayerSpacePaths()}
      {imageSpaceGroups.map(renderImageSpaceGroup)}
    </>
  );
};
