import { create } from "zustand";

export interface DrawingPath {
  id: string;
  path: string; // SVG Path data
  color: string;
  strokeWidth: number;
}

export interface VirtualLayer {
  id: string;
  type: "image" | "drawing" | "text";
  uri?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  opacity: number;
  zIndex: number;
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
  selectedLayerId: string | null;
  canvasSize: { width: number; height: number };

  // Actions
  setCanvasSize: (size: { width: number; height: number }) => void;
  setLayers: (layers: VirtualLayer[], selectedLayerId?: string | null) => void;
  addLayer: (layer: VirtualLayer) => void;
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

  // Z-Index / Order
  bringToFront: (id: string, addToHistory?: boolean) => void;
  sendToBack: (id: string, addToHistory?: boolean) => void;

  // History
  undo: () => void;
  redo: () => void;
  reset: () => void;

  // Internal
  history: HistoryState;
}

const normalizeZIndex = (layers: VirtualLayer[]): VirtualLayer[] =>
  layers.map((layer, index) => ({
    ...layer,
    zIndex: index + 1,
  }));

const buildHistory = (history: HistoryState, layers: VirtualLayer[]) => ({
  past: [...history.past, layers],
  future: [],
});

const resolveSelectedLayerId = (
  selectedLayerId: string | null,
  layers: VirtualLayer[],
) => (selectedLayerId && layers.some((layer) => layer.id === selectedLayerId) ? selectedLayerId : null);

export const useVirtualCreativityStore = create<VirtualCreativityStore>(
  (set, get) => ({
    layers: [],
    snapshots: [],
    selectedLayerId: null,
    canvasSize: { width: 0, height: 0 },
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

    removeLayer: (id) => {
      const { layers, history } = get();
      const newHistory = buildHistory(history, layers);
      const nextLayers = normalizeZIndex(layers.filter((l) => l.id !== id));
      set({
        layers: nextLayers,
        selectedLayerId: null,
        history: newHistory,
      });
    },

    updateLayer: (id, updates, addToHistory = true) => {
      const { layers, history } = get();
      const index = layers.findIndex((l) => l.id === id);
      if (index === -1) return;
      const previousLayer = layers[index];

      const hasMeaningfulChange = Object.entries(updates).some(
        ([key, value]) =>
          previousLayer[key as keyof VirtualLayer] !== value,
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

    bringToFront: (id, addToHistory = true) => {
      const { layers, history } = get();
      const index = layers.findIndex((l) => l.id === id);
      if (index === -1 || index === layers.length - 1) return;

      const newLayers = [...layers];
      const [item] = newLayers.splice(index, 1);
      newLayers.push(item);

      if (addToHistory) {
        set({
          layers: normalizeZIndex(newLayers),
          history: buildHistory(history, layers),
        });
        return;
      }

      set({ layers: normalizeZIndex(newLayers) });
    },

    sendToBack: (id, addToHistory = true) => {
      const { layers, history } = get();
      const index = layers.findIndex((l) => l.id === id);
      if (index === -1 || index === 0) return;

      const newLayers = [...layers];
      const [item] = newLayers.splice(index, 1);
      newLayers.unshift(item);

      if (addToHistory) {
        set({
          layers: normalizeZIndex(newLayers),
          history: buildHistory(history, layers),
        });
        return;
      }

      set({ layers: normalizeZIndex(newLayers) });
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
        selectedLayerId: resolveSelectedLayerId(selectedLayerId, normalizedNext),
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
        selectedLayerId: null,
        history: { past: [], future: [] },
      }),
  }),
);
