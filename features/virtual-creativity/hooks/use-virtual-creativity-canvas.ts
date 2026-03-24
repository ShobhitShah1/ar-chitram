import { useCallback, useEffect, useRef, useState } from "react";
import {
  BrushKind,
  SolidDrawMode,
  type VirtualLayer,
} from "@/features/virtual-creativity/store/virtual-creativity-store";
import { createSubImageLayer } from "@/features/virtual-creativity/services/virtual-layer-service";

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
  const [viewMode, setViewMode] = useState<"composite" | "single">("composite");
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;
    let cancelled = false;

    const initialize = async () => {
      const hasMainImage = layers.some((layer) => layer.id === "main-image");

      if (layers.length > 0) {
        if (!hasMainImage) {
          const baseLayers = getInitialLayers();
          if (!cancelled) {
            setLayers([...baseLayers, ...layers], null);
          }
        }

        if (!cancelled) {
          setViewMode("composite");
        }
        return;
      }

      if (pendingUploadUris.length > 0) {
        const uploadLayers = await Promise.all(
          pendingUploadUris.map((uri, index) =>
            createSubImageLayer(uri, index + 1),
          ),
        );

        if (cancelled) {
          return;
        }

        const baseLayers = getInitialLayers();
        const combined = [...baseLayers, ...uploadLayers];
        setLayers(combined, combined[0]?.id ?? null);
        clearPendingUploadUris();
        setViewMode("composite");
        return;
      }

      if (!cancelled) {
        setLayers(getInitialLayers(), null);
        setViewMode("composite");
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [
    clearPendingUploadUris,
    getInitialLayers,
    layers,
    pendingUploadUris,
    setLayers,
  ]);

  return { viewMode, setViewMode };
}

export function useBrush(initialColor: string) {
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
    },
    [],
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
