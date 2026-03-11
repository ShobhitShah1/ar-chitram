import { useCallback, useEffect, useState } from "react";
import {
  BrushKind,
  SolidDrawMode,
  type VirtualLayer,
} from "@/store/virtual-creativity-store";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utiles/story-frame";

export type BrushState = {
  kind: BrushKind;
  color: string;
  solidMode: SolidDrawMode;
  patternUri?: string;
  signatureId?: string;
};

export function useCanvasInitialization(
  layers: VirtualLayer[],
  pendingUploadUris: string[],
  setLayers: (layers: VirtualLayer[], selectedLayerId?: string | null) => void,
  clearPendingUploadUris: () => void,
  getInitialLayers: () => VirtualLayer[],
) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [viewMode, setViewMode] = useState<"composite" | "single">(
    "composite",
  );

  if (!isInitialized) {
    const hasMainImage = layers.some((layer) => layer.id === "main-image");

    if (layers.length > 0) {
      if (!hasMainImage) {
        const baseLayers = getInitialLayers();
        setLayers([...baseLayers, ...layers], null);
      }
      setViewMode("composite");
      setIsInitialized(true);
    } else if (pendingUploadUris.length > 0) {
      const uploadLayers: VirtualLayer[] = pendingUploadUris.map(
        (uri, index) => ({
          id: `upload-${Date.now()}-${index + 1}`,
          type: "image",
          uri,
          x: 0,
          y: 0,
          width: STORY_FRAME_WIDTH,
          height: STORY_FRAME_HEIGHT,
          rotation: 0,
          scale: 1,
          opacity: 1,
          zIndex: index + 1,
        }),
      );
      const baseLayers = getInitialLayers();
      const combined = [...baseLayers, ...uploadLayers];
      setLayers(combined, combined[0]?.id ?? null);
      clearPendingUploadUris();
      setViewMode("composite");
      setIsInitialized(true);
    } else {
      setLayers(getInitialLayers(), null);
      setViewMode("composite");
      setIsInitialized(true);
    }
  }

  return { viewMode, setViewMode };
}

export function useBrush(
  activeEditableLayerId: string | null,
  bringToFront: (id: string, addToHistory?: boolean) => void,
  initialColor: string,
) {
  const [brush, setBrush] = useState<BrushState>({
    kind: "solid",
    color: initialColor,
    solidMode: "object-draw",
  });

  useEffect(() => {
    setBrush((current) => {
      if (current.color !== "#000000") {
        return current;
      }

      return {
        ...current,
        color: initialColor,
      };
    });
  }, [initialColor]);

  const setBrushForActiveLayer = useCallback(
    (nextBrush: BrushState) => {
      setBrush(nextBrush);
      if (!activeEditableLayerId) return;
      if (activeEditableLayerId !== "main-image") {
        bringToFront(activeEditableLayerId, false);
      }
    },
    [activeEditableLayerId, bringToFront],
  );

  const onSelectColor = useCallback(
    (color: string, solidMode: SolidDrawMode = brush.solidMode) => {
      setBrushForActiveLayer({
        kind: "solid",
        color,
        solidMode,
      });
    },
    [brush.solidMode, setBrushForActiveLayer],
  );

  return { brush, setBrushForActiveLayer, onSelectColor };
}

