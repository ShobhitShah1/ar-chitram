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
  addLayer: (layer: VirtualLayer) => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<VirtualLayer>) => void;
  selectLayer: (id: string | null) => void;
  addSnapshot: (snapshot: VirtualCreativitySnapshot) => void;
  setSnapshots: (snapshots: VirtualCreativitySnapshot[]) => void;
  removeSnapshot: (id: string) => void;
  clearSnapshots: () => void;

  // Z-Index / Order
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;

  // History
  undo: () => void;
  redo: () => void;
  reset: () => void;

  // Internal
  history: HistoryState;
}

export const useVirtualCreativityStore = create<VirtualCreativityStore>(
  (set, get) => ({
    layers: [],
    snapshots: [],
    selectedLayerId: null,
    canvasSize: { width: 0, height: 0 },
    history: { past: [], future: [] },

    setCanvasSize: (size) => set({ canvasSize: size }),

    addLayer: (layer) => {
      const { layers, history } = get();
      const newHistory = {
        past: [...history.past, layers],
        future: [],
      };
      set({
        layers: [...layers, layer],
        selectedLayerId: layer.id,
        history: newHistory,
      });
    },

    removeLayer: (id) => {
      const { layers, history } = get();
      const newHistory = {
        past: [...history.past, layers],
        future: [],
      };
      set({
        layers: layers.filter((l) => l.id !== id),
        selectedLayerId: null,
        history: newHistory,
      });
    },

    updateLayer: (id, updates) => {
      const { layers } = get();
      const index = layers.findIndex((l) => l.id === id);
      if (index === -1) return;

      // For frequent updates (like dragging), we might want to skip history push every frame.
      // Ideally, history push happens on drag END.
      // For now, simpler implementation: direct update.
      // Real implementation would separate "fast update" from "commit update".

      const newLayers = [...layers];
      newLayers[index] = { ...newLayers[index], ...updates };

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

    bringToFront: (id) => {
      const { layers, history } = get();
      const index = layers.findIndex((l) => l.id === id);
      if (index === -1 || index === layers.length - 1) return;

      const newHistory = {
        past: [...history.past, layers],
        future: [],
      };

      const newLayers = [...layers];
      const [item] = newLayers.splice(index, 1);
      newLayers.push(item);

      set({ layers: newLayers, history: newHistory });
    },

    sendToBack: (id) => {
      const { layers, history } = get();
      const index = layers.findIndex((l) => l.id === id);
      if (index === -1 || index === 0) return;

      const newHistory = {
        past: [...history.past, layers],
        future: [],
      };

      const newLayers = [...layers];
      const [item] = newLayers.splice(index, 1);
      newLayers.unshift(item);

      set({ layers: newLayers, history: newHistory });
    },

    undo: () => {
      const { history, layers } = get();
      if (history.past.length === 0) return;

      const previous = history.past[history.past.length - 1];
      const newPast = history.past.slice(0, -1);

      set({
        layers: previous,
        selectedLayerId: null,
        history: {
          past: newPast,
          future: [layers, ...history.future],
        },
      });
    },

    redo: () => {
      const { history, layers } = get();
      if (history.future.length === 0) return;

      const next = history.future[0];
      const newFuture = history.future.slice(1);

      set({
        layers: next,
        selectedLayerId: null,
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
