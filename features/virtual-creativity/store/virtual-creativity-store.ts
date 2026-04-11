import { create } from "zustand";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utils/story-frame";

export type BrushKind = "solid" | "pattern" | "signature" | "smart-fill";
export type SolidDrawMode = "free-draw" | "object-draw" | "tap-fill" | "erase";

export interface DrawingPath {
  id: string;
  path: string; // SVG Path data
  color: string;
  strokeWidth: number;
  brushKind?: BrushKind;
  patternUri?: string;
  clipPath?: string;
  pathSpace?: "layer" | "image";
  pathSpaceWidth?: number;
  pathSpaceHeight?: number;
  regionTransform?: string;
  // Pre-sampled points along the path (for pattern images)
  patternStamps?: { x: number; y: number }[];
  signatureId?: string;
}

export interface VirtualLayer {
  id: string;
  type: "image" | "drawing" | "text";
  uri?: string;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  opacity: number;
  zIndex: number;
  stripOrder?: number;
  color?: string;
  paths?: DrawingPath[]; // For drawing layers or coloring on images
}

export interface VirtualCreativitySnapshot {
  id: string;
  uri: string;
  timestamp?: number;
}

interface HistoryState {
  past: VirtualLayer[][];
  future: VirtualLayer[][];
}

interface VirtualCreativityStore {
  layers: VirtualLayer[];
  snapshots: VirtualCreativitySnapshot[];
  drawingHistorySnapshots: VirtualCreativitySnapshot[];
  selectedLayerId: string | null;
  canvasSize: { width: number; height: number };
  pendingUploadUris: string[];

  setCanvasSize: (size: { width: number; height: number }) => void;
  setLayers: (layers: VirtualLayer[], selectedLayerId?: string | null) => void;
  addLayer: (layer: VirtualLayer) => void;
  addImageLayerFromUri: (uri: string) => void;
  addImageLayersFromUris: (uris: string[]) => void;
  removeLayer: (id: string) => void;
  updateLayer: (
    id: string,
    updates: Partial<VirtualLayer>,
    addToHistory?: boolean,
  ) => void;
  selectLayer: (id: string | null) => void;
  addSnapshot: (snapshot: VirtualCreativitySnapshot) => void;
  setSnapshots: (snapshots: VirtualCreativitySnapshot[]) => void;
  removeSnapshot: (id: string) => void;
  clearSnapshots: () => void;
  setDrawingHistorySnapshots: (snapshots: VirtualCreativitySnapshot[]) => void;
  clearDrawingHistorySnapshots: () => void;

  setPendingUploadUris: (uris: string[]) => void;
  clearPendingUploadUris: () => void;

  bringToFront: (id: string, addToHistory?: boolean) => void;
  sendToBack: (id: string, addToHistory?: boolean) => void;

  undo: () => void;
  redo: () => void;
  reset: () => void;

  history: HistoryState;
}

const normalizeZIndex = (layers: VirtualLayer[]): VirtualLayer[] =>
  layers.map((layer, index) => ({
    ...layer,
    zIndex: index + 1,
    stripOrder: index + 1,
  }));

const buildHistory = (history: HistoryState, layers: VirtualLayer[]) => ({
  past: [...history.past, layers],
  future: [],
});

const resolveSelectedLayerId = (
  selectedLayerId: string | null,
  layers: VirtualLayer[],
) =>
  selectedLayerId && layers.some((layer) => layer.id === selectedLayerId)
    ? selectedLayerId
    : null;

export const useVirtualCreativityStore = create<VirtualCreativityStore>(
  (set, get) => ({
    layers: [],
    snapshots: [],
    drawingHistorySnapshots: [],
    selectedLayerId: null,
    canvasSize: { width: 0, height: 0 },
    pendingUploadUris: [],
    history: { past: [], future: [] },

    setCanvasSize: (size) => set({ canvasSize: size }),
    setLayers: (layers, selectedLayerId = null) =>
      set({
        layers: normalizeZIndex(layers),
        selectedLayerId,
        history: { past: [], future: [] },
      }),

    addLayer: (layer) => {
      const { layers, history } = get();
      const newHistory = buildHistory(history, layers);
      const nextLayers = normalizeZIndex([...layers, layer]);
      set({
        layers: nextLayers,
        selectedLayerId: layer.id,
        history: newHistory,
      });
    },

    addImageLayerFromUri: (uri) => {
      const { layers, history } = get();
      const id = `upload-${Date.now()}-${layers.length + 1}`;
      const newLayer: VirtualLayer = {
        id,
        type: "image",
        uri,
        x: 0,
        y: 0,
        width: STORY_FRAME_WIDTH,
        height: STORY_FRAME_HEIGHT,
        rotation: 0,
        scale: 1,
        opacity: 1,
        zIndex: layers.length + 1,
      };

      const newHistory = buildHistory(history, layers);
      const nextLayers = normalizeZIndex([...layers, newLayer]);

      set({
        layers: nextLayers,
        selectedLayerId: id,
        history: newHistory,
      });
    },

    addImageLayersFromUris: (uris) => {
      uris.forEach((uri) => {
        if (uri) {
          get().addImageLayerFromUri(uri);
        }
      });
    },

    removeLayer: (id) => {
      const { layers, history } = get();
      const newHistory = buildHistory(history, layers);
      const nextLayers = normalizeZIndex(
        layers.filter((layer) => layer.id !== id),
      );
      set({
        layers: nextLayers,
        selectedLayerId: null,
        history: newHistory,
      });
    },

    updateLayer: (id, updates, addToHistory = true) => {
      const { layers, history } = get();
      const index = layers.findIndex((layer) => layer.id === id);
      if (index === -1) return;
      const previousLayer = layers[index];

      const hasMeaningfulChange = Object.entries(updates).some(
        ([key, value]) => previousLayer[key as keyof VirtualLayer] !== value,
      );
      if (!hasMeaningfulChange) return;

      const newLayers = [...layers];
      newLayers[index] = { ...previousLayer, ...updates };

      if (addToHistory) {
        set({
          layers: newLayers,
          history: buildHistory(history, layers),
        });
        return;
      }

      set({ layers: newLayers });
    },

    selectLayer: (id) => set({ selectedLayerId: id }),
    addSnapshot: (snapshot) =>
      set((state) => ({ snapshots: [...state.snapshots, snapshot] })),
    setSnapshots: (snapshots) => set({ snapshots }),
    removeSnapshot: (id) =>
      set((state) => ({
        snapshots: state.snapshots.filter((snapshot) => snapshot.id !== id),
      })),
    clearSnapshots: () => set({ snapshots: [] }),
    setDrawingHistorySnapshots: (snapshots) =>
      set({ drawingHistorySnapshots: snapshots }),
    clearDrawingHistorySnapshots: () => set({ drawingHistorySnapshots: [] }),

    setPendingUploadUris: (uris) => set({ pendingUploadUris: uris }),
    clearPendingUploadUris: () => set({ pendingUploadUris: [] }),

    bringToFront: (id, addToHistory = true) => {
      const { layers, history } = get();
      if (id === "main-image") return;

      const index = layers.findIndex((layer) => layer.id === id);
      if (index === -1 || index === layers.length - 1) return;

      const nextLayers = [...layers];
      const [item] = nextLayers.splice(index, 1);
      nextLayers.push(item);

      if (addToHistory) {
        set({
          layers: normalizeZIndex(nextLayers),
          history: buildHistory(history, layers),
        });
        return;
      }

      set({ layers: normalizeZIndex(nextLayers) });
    },

    sendToBack: (id, addToHistory = true) => {
      const { layers, history } = get();
      if (id === "main-image") return;

      const index = layers.findIndex((layer) => layer.id === id);
      if (index <= 0) return;

      const nextLayers = [...layers];
      const [item] = nextLayers.splice(index, 1);
      nextLayers.unshift(item);

      if (addToHistory) {
        set({
          layers: normalizeZIndex(nextLayers),
          history: buildHistory(history, layers),
        });
        return;
      }

      set({ layers: normalizeZIndex(nextLayers) });
    },

    undo: () => {
      const { history, layers, selectedLayerId } = get();
      if (history.past.length === 0) return;

      const previous = history.past[history.past.length - 1];
      const newPast = history.past.slice(0, -1);
      const normalizedPrevious = normalizeZIndex(previous);

      set({
        layers: normalizedPrevious,
        selectedLayerId: resolveSelectedLayerId(
          selectedLayerId,
          normalizedPrevious,
        ),
        history: {
          past: newPast,
          future: [layers, ...history.future],
        },
      });
    },

    redo: () => {
      const { history, layers, selectedLayerId } = get();
      if (history.future.length === 0) return;

      const next = history.future[0];
      const newFuture = history.future.slice(1);
      const normalizedNext = normalizeZIndex(next);

      set({
        layers: normalizedNext,
        selectedLayerId: resolveSelectedLayerId(
          selectedLayerId,
          normalizedNext,
        ),
        history: {
          past: [...history.past, layers],
          future: newFuture,
        },
      });
    },

    reset: () =>
      set({
        layers: [],
        snapshots: [],
        drawingHistorySnapshots: [],
        selectedLayerId: null,
        pendingUploadUris: [],
        history: { past: [], future: [] },
      }),
  }),
);
