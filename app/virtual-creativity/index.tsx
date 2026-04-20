import {
  CapturePreviewModal,
  Snapshot,
} from "@/components/drawing/capture-preview-modal";
import ScreenshotCaptureAnimation from "@/components/drawing/screenshot-capture-animation";
import type { GridAssetItem } from "@/components/image-grid";
import { PremiumAssetModal } from "@/components/premium-asset-modal";
import { FontFamily } from "@/constants/fonts";
import { PREMIUM_PICKER_ENTRY_MODE } from "@/constants/premium-config";
import { useTheme } from "@/context/theme-context";
import { persistLocalArtCaptures } from "@/features/gallery/services/local-gallery-service";
import {
  BottomBar,
  ToolType,
} from "@/features/virtual-creativity/components/bottom-bar";
import { CanvasViewer } from "@/features/virtual-creativity/components/canvas-viewer";
import { ColorPickerModal } from "@/features/virtual-creativity/components/color-picker-modal";
import { ImageUploadFlowModal } from "@/features/virtual-creativity/components/image-upload-flow-modal";
import { LayerStrip } from "@/features/virtual-creativity/components/layer-strip";
import { PatternModal } from "@/features/virtual-creativity/components/pattern-modal";
import { SignatureModal } from "@/features/virtual-creativity/components/signature-modal";
import { TopBar } from "@/features/virtual-creativity/components/top-bar";
import { UploadAssetSheet } from "@/features/virtual-creativity/components/upload-asset-sheet";
import {
  type PatternPreset,
  type SignatureSelection,
} from "@/features/virtual-creativity/constants/editor-presets";
import { useImageUploadFlow } from "@/features/virtual-creativity/hooks/use-image-upload-flow";
import {
  useBrush,
  useCanvasInitialization,
} from "@/features/virtual-creativity/hooks/use-virtual-creativity-canvas";
import {
  clearAllLocalUploads,
  fetchLocalUploadTabAssets,
} from "@/features/virtual-creativity/services/local-upload-asset-service";
import {
  primeSmartFillLookup,
  type SmartFillSpace,
} from "@/features/virtual-creativity/services/smart-fill-path-service";
import {
  createMainImageLayer,
  createSignatureImageLayer,
  createSignatureTextLayer,
  createSubImageLayer,
} from "@/features/virtual-creativity/services/virtual-layer-service";
import {
  VirtualLayer,
  useVirtualCreativityStore,
} from "@/features/virtual-creativity/store/virtual-creativity-store";
import {
  useCreateFlowAssetPicker,
  type CreateFlowPickerAssetItem,
} from "@/hooks/api/use-tab-assets-api";
import { usePremiumAssetActionFlow } from "@/hooks/use-premium-asset-guide-flow";
import {
  logDrawingCompleted,
  logDrawingStarted,
} from "@/services/analytics-service";
import { apiQueryKeys } from "@/services/api/query-keys";
import { normalizeStoryImageUri } from "@/services/story-media-service";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utils/story-frame";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImageManipulator from "expo-image-manipulator";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Dimensions,
  Platform,
  Image as RNImage,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const EMPTY_LAYERS: VirtualLayer[] = [];
const HORIZONTAL_GUTTER = 16;
const WORKSPACE_GAP = 6;
const WORKSPACE_BOTTOM_PADDING = 8;

const getInitialLayers = (): VirtualLayer[] => [];

export default function VirtualCreativityScreen() {
  const { theme, isDark } = useTheme();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isPremiumPickerModalFlow = PREMIUM_PICKER_ENTRY_MODE === "modal";
  const assetPickerModalRef = useRef<BottomSheetModal | null>(null);
  const isAssetPickerVisibleRef = useRef(false);
  const lastDrawingToolRef = useRef<ToolType>("palette");
  const pendingUploadFlowLaunchRef = useRef(false);
  const lastAutoPlacedStoredUploadsKeyRef = useRef<string | null>(null);
  const { data: storedUploadAssetsData } = useQuery({
    queryKey: apiQueryKeys.assets.localUploads,
    queryFn: fetchLocalUploadTabAssets,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  const {
    assets: uploadSheetAssets,
    sourceOptions: uploadSourceOptions,
    selectedSourceId: uploadSelectedSourceId,
    setSelectedSourceId: setUploadSelectedSourceId,
    categoryOptions: uploadCategoryOptions,
    selectedCategoryId: uploadSelectedCategoryId,
    setSelectedCategoryId: setUploadSelectedCategoryId,
    isLoading: isUploadSheetLoading,
    isError: isUploadSheetError,
    shuffle: onShufflePressSheet,
    refetch: refetchUploadSheetAssets,
  } = useCreateFlowAssetPicker();

  const {
    layers,
    snapshots,
    addLayer,
    addSnapshot,
    setSnapshots,
    removeSnapshot,
    setLayers,
    history,
    undo,
    redo,
    removeLayer,
    updateLayer,
    bringToFront,
    sendToBack,
    selectedLayerId,
    selectLayer,
    pendingUploadUris,
    clearPendingUploadUris,
    setDrawingHistorySnapshots,
    reset,
  } = useVirtualCreativityStore();

  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<"color" | "gradient">("color");
  const [selectedTool, setSelectedTool] = useState<ToolType>(() =>
    pendingUploadUris.length > 0 ? "gallery" : "palette",
  );
  const [patternModalVisible, setPatternModalVisible] = useState(false);
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(
    null,
  );
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(
    null,
  );
  const [isFocusPlacementActive, setIsFocusPlacementActive] = useState(false);

  const [isZoomMode, setIsZoomMode] = useState(false);
  const [handModeLayerIds, setHandModeLayerIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [zoomResetKey, setZoomResetKey] = useState(0);
  const [isCanvasCaptureInProgress, setIsCanvasCaptureInProgress] =
    useState(false);

  const viewShotRef = useRef<View>(null);
  const [snapshotUri, setSnapshotUri] = useState<string | null>(null);
  const [showSnapshotAnim, setShowSnapshotAnim] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [isSmartFillPreloading, setIsSmartFillPreloading] = useState(true);
  const preloadedSmartFillUrisRef = useRef<Set<string>>(new Set());
  const failedPreloadUrisRef = useRef<Set<string>>(new Set());
  const preloadJobRef = useRef(0);
  const [smartFillSpacesByUri, setSmartFillSpacesByUri] = useState<
    Record<string, SmartFillSpace>
  >({});

  const { viewMode, setViewMode } = useCanvasInitialization(
    layers,
    pendingUploadUris,
    setLayers,
    clearPendingUploadUris,
    getInitialLayers,
  );

  React.useEffect(() => {
    if (viewMode === "single" && !selectedLayerId) {
      setViewMode("composite");
      setIsFocusPlacementActive(false);
    }
  }, [selectedLayerId, setViewMode, viewMode]);

  const allLayersSorted = useMemo(
    () => [...layers].sort((a, b) => a.zIndex - b.zIndex),
    [layers],
  );
  const mainImageUri = useMemo(
    () =>
      allLayersSorted.find((layer) => layer.id === "main-image")?.uri ?? null,
    [allLayersSorted],
  );

  const activeSubLayerUri = useMemo(() => {
    if (!selectedLayerId || selectedLayerId === "main-image") {
      return null;
    }
    return layers.find((l) => l.id === selectedLayerId)?.uri ?? null;
  }, [layers, selectedLayerId]);

  const preloadTargetUrisJson = useMemo(() => {
    const targets = [];
    if (mainImageUri) {
      targets.push(mainImageUri);
    }
    if (activeSubLayerUri) {
      targets.push(activeSubLayerUri);
    }
    return JSON.stringify(targets);
  }, [mainImageUri, activeSubLayerUri]);

  const smartFillSpacesByLayerId = useMemo(() => {
    const result: Record<string, SmartFillSpace> = {};
    for (const layer of layers) {
      if (layer.uri && smartFillSpacesByUri[layer.uri]) {
        result[layer.id] = smartFillSpacesByUri[layer.uri];
      }
    }
    return result;
  }, [layers, smartFillSpacesByUri]);

  React.useEffect(() => {
    const targetUris = JSON.parse(preloadTargetUrisJson) as string[];
    if (targetUris.length === 0) {
      return;
    }

    const urisToProcess = targetUris.filter(
      (uri) =>
        !preloadedSmartFillUrisRef.current.has(uri) &&
        !failedPreloadUrisRef.current.has(uri),
    );

    if (urisToProcess.length === 0) {
      return;
    }

    let cancelled = false;
    const jobId = ++preloadJobRef.current;

    void Promise.all(
      urisToProcess.map((uri) =>
        primeSmartFillLookup({ imageUri: uri })
          .then((space) => {
            if (!cancelled && preloadJobRef.current === jobId) {
              preloadedSmartFillUrisRef.current.add(uri);
              setSmartFillSpacesByUri((prev) => ({ ...prev, [uri]: space }));
            }
          })
          .catch((error) => {
            console.warn(`Smart fill preload failed for ${uri}:`, error);
            if (!cancelled && preloadJobRef.current === jobId) {
              failedPreloadUrisRef.current.add(uri);
            }
          }),
      ),
    );

    return () => {
      cancelled = true;
    };
  }, [preloadTargetUrisJson]);

  const compositeVisibleLayers = useMemo(
    () => allLayersSorted,
    [allLayersSorted],
  );

  const hasMainLayer = useMemo(
    () => layers.some((layer) => layer.id === "main-image"),
    [layers],
  );
  const selectedSubLayerId = useMemo(
    () =>
      selectedLayerId && selectedLayerId !== "main-image"
        ? selectedLayerId
        : null,
    [selectedLayerId],
  );
  const isSingleSubLayerView = viewMode === "single" && !!selectedSubLayerId;
  const brushTargetLayerId = useMemo(() => {
    if (isSingleSubLayerView) {
      return selectedSubLayerId;
    }

    return hasMainLayer ? "main-image" : null;
  }, [hasMainLayer, isSingleSubLayerView, selectedSubLayerId]);
  const activeCanvasLayerId = useMemo(() => {
    if (
      selectedTool === "preview" ||
      isFocusPlacementActive ||
      handModeLayerIds.size > 0
    ) {
      return null;
    }

    return brushTargetLayerId;
  }, [
    brushTargetLayerId,
    isFocusPlacementActive,
    selectedTool,
    handModeLayerIds,
  ]);

  const drawingStartedLoggedRef = React.useRef(false);
  React.useEffect(() => {
    if (activeCanvasLayerId && !drawingStartedLoggedRef.current) {
      logDrawingStarted("virtual");
      drawingStartedLoggedRef.current = true;
    }
  }, [activeCanvasLayerId]);

  const activeOrderLayerId = selectedSubLayerId;
  const canDeleteLayer = !!selectedSubLayerId;
  const isLayerSelectionMode = viewMode === "composite" && !isZoomMode;

  const defaultBrushColor =
    typeof theme.accent === "string" && theme.accent.startsWith("#")
      ? theme.accent
      : "#3259F4";

  const { brush, setBrushForActiveLayer, onSelectColor } =
    useBrush(defaultBrushColor);

  const displayedLayers = useMemo(() => {
    if (viewMode === "single" && selectedSubLayerId) {
      return allLayersSorted.filter((layer) => layer.id === selectedSubLayerId);
    }

    return compositeVisibleLayers;
  }, [allLayersSorted, compositeVisibleLayers, selectedSubLayerId, viewMode]);

  const stripLayers = useMemo(
    () =>
      allLayersSorted.filter(
        (layer) => layer.id !== "main-image" && layer.type === "image",
      ),
    [allLayersSorted],
  );
  const hasOnlyMainAndNonImageLayers = useMemo(
    () =>
      layers.length > 0 &&
      layers.every(
        (layer) => layer.id === "main-image" || layer.type !== "image",
      ),
    [layers],
  );
  const bottomBarLayers = useMemo(
    () => (viewMode === "single" ? compositeVisibleLayers : EMPTY_LAYERS),
    [compositeVisibleLayers, viewMode],
  );

  const waitForNextFrame = useCallback(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    [],
  );

  const restoreDrawingTool = useCallback(() => {
    setSelectedTool(lastDrawingToolRef.current);
  }, []);

  const warmSmartFillLookup = useCallback((imageUri?: string | null) => {
    if (!imageUri) {
      return;
    }

    void primeSmartFillLookup({ imageUri })
      .then((space) => {
        preloadedSmartFillUrisRef.current.add(imageUri);
        setSmartFillSpacesByUri((prev) =>
          prev[imageUri] &&
          prev[imageUri].width === space.width &&
          prev[imageUri].height === space.height
            ? prev
            : { ...prev, [imageUri]: space },
        );
      })
      .catch(() => {
        // Warm cache in the background without interrupting the current flow.
      });
  }, []);

  /**
   * DISABLED: Autoloading stored uploads as sub-layers.
   * This was causing double-imaging when starting from a home upload.
   * 
  React.useEffect(() => {
    if (storedUploadAssetsData === undefined) {
      return;
    }

    if (!mainImageUri || pendingUploadUris.length > 0) {
      return;
    }

    if (storedUploadAssetsData.flatAssets.length === 0) {
      return;
    }

    if (!hasOnlyMainAndNonImageLayers || stripLayers.length > 0) {
      return;
    }

    const autoPlaceKey = `${mainImageUri}::${storedUploadAssetsData.flatAssets
      .map((asset) => asset.id)
      .join("|")}`;

    if (lastAutoPlacedStoredUploadsKeyRef.current === autoPlaceKey) {
      return;
    }

    lastAutoPlacedStoredUploadsKeyRef.current = autoPlaceKey;

    let cancelled = false;

    const hydrateStoredUploads = async () => {
      const uploadLayers = await Promise.all(
        storedUploadAssetsData.flatAssets.map((asset, index) =>
          createSubImageLayer(asset.image, layers.length + index + 1),
        ),
      );

      if (cancelled || uploadLayers.length === 0) {
        return;
      }

      // Align images side-by-side in a grid
      const itemsPerRow = 2;
      const gap = 48;
      const standardWidth = 440;
      const standardHeight = 600;

      uploadLayers.forEach((layer, index) => {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;

        const numInThisRow = Math.min(
          itemsPerRow,
          uploadLayers.length - row * itemsPerRow,
        );
        const rowWidth =
          numInThisRow * standardWidth + (numInThisRow - 1) * gap;
        const rowStartX = -(rowWidth / 2) + standardWidth / 2;

        const totalRows = Math.ceil(uploadLayers.length / itemsPerRow);
        const gridHeight = totalRows * standardHeight + (totalRows - 1) * gap;
        const startY = -(gridHeight / 2) + standardHeight / 2;

        layer.x = rowStartX + col * (standardWidth + gap);
        layer.y = startY + row * (standardHeight + gap);
      });

      setLayers([...layers, ...uploadLayers], uploadLayers[0]?.id ?? null);

      setHandModeLayerIds((prev) => {
        const next = new Set(prev);
        for (const layer of uploadLayers) {
          next.add(layer.id);
        }
        return next;
      });

      setSelectedTool("gallery");
      setIsFocusPlacementActive(false);
      setViewMode("composite");
      warmSmartFillLookup(uploadLayers[0]?.uri);
    };

    void hydrateStoredUploads();

    return () => {
      cancelled = true;
    };
  }, [
    hasOnlyMainAndNonImageLayers,
    layers,
    mainImageUri,
    layers.length,
    stripLayers.length,
    pendingUploadUris.length,
    setLayers,
    // setViewMode,
    storedUploadAssetsData,
    warmSmartFillLookup,
  ]);
  */

  const handleUndo = useCallback(() => undo(), [undo]);
  const handleRedo = useCallback(() => redo(), [redo]);

  const handleBringToFront = useCallback(() => {
    if (activeOrderLayerId) {
      bringToFront(activeOrderLayerId);
      if (viewMode === "single") {
        setSelectedTool("gallery");
        setViewMode("composite");
      }
    }
  }, [activeOrderLayerId, bringToFront, viewMode, setViewMode]);

  const handleSendToBack = useCallback(() => {
    if (activeOrderLayerId) {
      sendToBack(activeOrderLayerId);
      if (viewMode === "single") {
        setSelectedTool("gallery");
        setViewMode("composite");
      }
    }
  }, [activeOrderLayerId, sendToBack, viewMode, setViewMode]);

  const handleZoomToggle = useCallback(() => {
    setIsZoomMode((prev) => !prev);
  }, []);

  const handleToggleHandMode = useCallback((layerId: string) => {
    setHandModeLayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      return next;
    });
  }, []);

  const confirmRemoveLayer = useCallback(
    (layerId: string) => {
      const targetLayer = allLayersSorted.find((layer) => layer.id === layerId);
      if (!targetLayer || targetLayer.id === "main-image") {
        return;
      }

      Alert.alert(
        targetLayer.type === "text" ? "Remove Signature" : "Remove Image",
        targetLayer.type === "text"
          ? "Remove this signature from the canvas?"
          : "Remove this image from the canvas?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              removeLayer(layerId);
              selectLayer(null);
              setIsFocusPlacementActive(false);
              setViewMode("composite");
              restoreDrawingTool();
            },
          },
        ],
      );
    },
    [
      allLayersSorted,
      removeLayer,
      restoreDrawingTool,
      selectLayer,
      setViewMode,
    ],
  );

  const handleDelete = useCallback(() => {
    if (selectedSubLayerId) {
      confirmRemoveLayer(selectedSubLayerId);
    }
  }, [confirmRemoveLayer, selectedSubLayerId]);

  const captureCanvasSnapshot = useCallback(
    async (quality: number) => {
      if (!viewShotRef.current) {
        return null;
      }

      setIsCanvasCaptureInProgress(true);
      await waitForNextFrame();
      await waitForNextFrame();

      try {
        const capturedUri = await captureRef(viewShotRef, {
          format: "png",
          quality,
        });

        return normalizeStoryImageUri(capturedUri, {
          format: ImageManipulator.SaveFormat.PNG,
          compress: 1,
          targetWidth: STORY_FRAME_WIDTH,
          targetHeight: STORY_FRAME_HEIGHT,
          fit: "contain",
        });
      } finally {
        setIsCanvasCaptureInProgress(false);
      }
    },
    [waitForNextFrame],
  );

  const handleNext = useCallback(async () => {
    if (viewMode === "single") {
      return;
    }

    // Deselect everything to ensure a clean capture
    selectLayer(null);
    setHandModeLayerIds(new Set());
    setIsZoomMode(false);
    setIsFocusPlacementActive(false);

    try {
      const uri = await captureCanvasSnapshot(1);
      if (uri) {
        setDrawingHistorySnapshots([
          ...snapshots,
          {
            id: "final-" + Date.now(),
            uri,
            timestamp: Date.now(),
          },
        ]);

        logDrawingCompleted("virtual");
        try {
          const persistedUris = Array.from(
            new Set(
              snapshots
                .map((snapshot) => snapshot.uri?.trim())
                .filter((snapshotUri): snapshotUri is string =>
                  Boolean(snapshotUri),
                ),
            ),
          );

          if (persistedUris.length > 0) {
            await persistLocalArtCaptures(persistedUris, {
              originalUri: mainImageUri ?? uri,
            });
          }
        } catch (error) {
          console.warn("Failed to persist virtual creativity capture:", error);
        }

        router.push({
          pathname: "/virtual-creativity/preview",
          params: {
            imageUri: uri,
            originalImageUri: mainImageUri ?? uri,
          },
        });
      }
    } catch (error) {
      console.error("Failed to capture snapshot for next step:", error);
    }
  }, [
    captureCanvasSnapshot,
    mainImageUri,
    router,
    snapshots,
    viewMode,
    selectLayer,
    setHandModeLayerIds,
    setIsZoomMode,
    setIsFocusPlacementActive,
  ]);

  const presentAssetPicker = useCallback(() => {
    isAssetPickerVisibleRef.current = true;
    assetPickerModalRef.current?.present();
  }, []);

  const dismissAssetPicker = useCallback(() => {
    isAssetPickerVisibleRef.current = false;
    assetPickerModalRef.current?.dismiss();
  }, []);

  const handleGallery = useCallback(() => {
    setIsFocusPlacementActive(false);
    setColorPickerVisible(false);
    setPatternModalVisible(false);
    setSignatureModalVisible(false);
    setSelectedTool("gallery");

    if (viewMode === "composite") {
      presentAssetPicker();
    }
  }, [presentAssetPicker, viewMode]);

  const selectLayerForPlacement = useCallback(
    (layerId: string) => {
      selectLayer(layerId);
      setHandModeLayerIds((prev) => {
        const layer = layers.find((l) => l.id === layerId);
        const next = new Set<string>();
        if (layer?.type === "text") {
          return next;
        }

        next.add(layerId);
        return next;
      });
      setSelectedTool("gallery");
      setIsFocusPlacementActive(false);
      setViewMode("composite");
    },
    [selectLayer, setViewMode, setHandModeLayerIds],
  );

  const applyImageToCanvas = useCallback(
    async (imageUri: string) => {
      if (!hasMainLayer) {
        const overlayLayers = allLayersSorted.filter(
          (layer) => layer.id !== "main-image",
        );

        setLayers(
          [createMainImageLayer(imageUri), ...overlayLayers],
          selectedLayerId,
        );
        setSelectedTool("gallery");
        setIsFocusPlacementActive(false);
        warmSmartFillLookup(imageUri);
        setViewMode("composite");
        return;
      }

      const subLayer = await createSubImageLayer(
        imageUri,
        allLayersSorted.length + 1,
        layers,
      );
      addLayer(subLayer);
      selectLayerForPlacement(subLayer.id);
      warmSmartFillLookup(subLayer.uri);
    },
    [
      addLayer,
      allLayersSorted,
      hasMainLayer,
      selectLayerForPlacement,
      selectedLayerId,
      setLayers,
      setViewMode,
      warmSmartFillLookup,
    ],
  );

  const handleApplyUploadAsset = useCallback(
    async (item: CreateFlowPickerAssetItem) => {
      try {
        if (item.id === "blank") {
          dismissAssetPicker();
          setSelectedTool("palette");
          setIsFocusPlacementActive(false);
          setViewMode("composite");
          return true;
        }

        await applyImageToCanvas(item.image);
        dismissAssetPicker();
        return true;
      } catch (error) {
        console.error("Failed to apply upload asset:", error);
        return false;
      }
    },
    [applyImageToCanvas, dismissAssetPicker, setViewMode],
  );

  const {
    selectedPremiumAsset,
    premiumPriceLabel,
    isPremiumAssetUnlocked,
    getPremiumPriceLabelForAsset,
    preloadAssetProduct,
    isFreePremiumActionBusy,
    isPremiumActionBusy,
    handleAssetPress: handleUploadPremiumAssetPress,
    handleClosePremiumAsset,
    handleFreePremiumAsset,
    handlePremiumAsset,
  } = usePremiumAssetActionFlow<CreateFlowPickerAssetItem>({
    onUnlockedAction: handleApplyUploadAsset,
    preloadItems: uploadSheetAssets,
  });

  const { startUploadFlow, isPickingImage, modalProps } = useImageUploadFlow({
    title: "Upload To Canvas",
    description:
      "Pick an image, preview the background removal, then add that version to your canvas.",
    doneLabel: hasMainLayer ? "Add to Canvas" : "Use as Main Image",
    onComplete: async ({ finalUri }) => {
      try {
        await applyImageToCanvas(finalUri);
        dismissAssetPicker();
      } catch (error) {
        console.error("Failed to apply uploaded image:", error);
      }
    },
  });

  const handleStartUploadFlow = useCallback(() => {
    if (isPickingImage) {
      return;
    }

    pendingUploadFlowLaunchRef.current = true;
    dismissAssetPicker();
  }, [dismissAssetPicker, isPickingImage]);

  const handleCloseAssetPicker = useCallback(() => {
    isAssetPickerVisibleRef.current = false;

    if (!pendingUploadFlowLaunchRef.current) {
      return;
    }

    pendingUploadFlowLaunchRef.current = false;
    requestAnimationFrame(() => {
      void startUploadFlow();
    });
  }, [startUploadFlow]);

  const handlePalette = useCallback(() => {
    lastDrawingToolRef.current = "palette";
    if (viewMode === "composite") {
      selectLayer(null);
      setHandModeLayerIds(new Set());
    }
    setIsFocusPlacementActive(false);
    setSelectedTool("palette");
    setSelectedPatternId(null);
    setPickerMode("color");
    setPatternModalVisible(false);
    setSignatureModalVisible(false);
    setColorPickerVisible(true);
  }, [selectLayer, setHandModeLayerIds, viewMode]);

  const handlePattern = useCallback(() => {
    lastDrawingToolRef.current = "pattern";
    if (viewMode === "composite") {
      selectLayer(null);
      setHandModeLayerIds(new Set());
    }
    setIsFocusPlacementActive(false);
    setSelectedTool("pattern");
    setColorPickerVisible(false);
    setSignatureModalVisible(false);
    setPatternModalVisible(true);
  }, [selectLayer, setHandModeLayerIds, viewMode]);

  const handleStroke = useCallback(() => {
    lastDrawingToolRef.current = "stroke";
    if (viewMode === "composite") {
      selectLayer(null);
      setHandModeLayerIds(new Set());
    }
    setIsFocusPlacementActive(false);
    setSelectedTool("stroke");
    setColorPickerVisible(false);
    setPatternModalVisible(false);
    setSignatureModalVisible(true);
  }, [selectLayer, setHandModeLayerIds, viewMode]);

  const handlePreview = useCallback(async () => {
    // Deselect everything to ensure a clean capture
    selectLayer(null);
    setHandModeLayerIds(new Set());
    setIsZoomMode(false);
    setIsFocusPlacementActive(false);

    setSelectedTool("preview");
    try {
      const uri = await captureCanvasSnapshot(0.9);
      if (uri) {
        const newSnapshot: Snapshot = {
          id: Date.now().toString(),
          uri,
          timestamp: Date.now(),
        };

        setSnapshotUri(uri);
        addSnapshot(newSnapshot);
        setShowSnapshotAnim(true);
      }
    } catch (error) {
      console.error("Snapshot failed:", error);
    } finally {
      // Restore the drawing tool so user can continue editing immediately
      restoreDrawingTool();
    }
  }, [
    addSnapshot,
    captureCanvasSnapshot,
    selectLayer,
    setHandModeLayerIds,
    setIsZoomMode,
    setIsFocusPlacementActive,
    restoreDrawingTool,
  ]);

  const handlePreviewLongPress = useCallback(() => {
    setShowPreviewModal(true);
  }, []);

  const handleSelectCanvasLayer = useCallback(
    (id: string | null) => {
      if (!id) {
        setHandModeLayerIds(new Set());
        selectLayer(null);
        setIsFocusPlacementActive(false);
        return;
      }

      const targetLayer = allLayersSorted.find((layer) => layer.id === id);
      if (!targetLayer) {
        return;
      }

      if (selectedLayerId === id) {
        setHandModeLayerIds((prev) => {
          if (targetLayer.type === "text" || !prev.has(id)) {
            return new Set();
          }

          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        selectLayer(null);
        setIsFocusPlacementActive(false);
        return;
      }

      setHandModeLayerIds(
        targetLayer.type === "image" ? new Set([id]) : new Set(),
      );

      selectLayer(id);
      setIsFocusPlacementActive(false);
      setViewMode("composite");
    },
    [
      allLayersSorted,
      selectLayer,
      selectedLayerId,
      setHandModeLayerIds,
      setViewMode,
    ],
  );

  const handleLayerLongPress = useCallback(
    (layerId: string) => {
      const targetLayer = allLayersSorted.find((layer) => layer.id === layerId);
      if (!targetLayer || targetLayer.id === "main-image") {
        return;
      }

      selectLayer(layerId);

      Alert.alert(
        targetLayer.type === "text" ? "Signature Options" : "Layer Options",
        targetLayer.type === "text"
          ? "Manage this signature on the canvas."
          : "Manage this image on the canvas.",
        [
          {
            text: "Send Back",
            onPress: () => {
              sendToBack(layerId);
              setSelectedTool("gallery");
              setViewMode("composite");
            },
          },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => confirmRemoveLayer(layerId),
          },
          {
            text: "Bring Front",
            onPress: () => {
              bringToFront(layerId);
              setSelectedTool("gallery");
              setViewMode("composite");
            },
          },
        ],
        { cancelable: true },
      );
    },
    [
      allLayersSorted,
      bringToFront,
      confirmRemoveLayer,
      selectLayer,
      sendToBack,
      setViewMode,
    ],
  );

  const handleOpenLayerEditor = useCallback(
    (id: string) => {
      const targetLayer = allLayersSorted.find((layer) => layer.id === id);
      if (!targetLayer) {
        return;
      }

      if (targetLayer.type === "text") {
        selectLayerForPlacement(id);
        return;
      }

      selectLayer(id);
      setIsFocusPlacementActive(false);
      restoreDrawingTool();
      warmSmartFillLookup(targetLayer?.uri);
      setViewMode("single");
    },
    [
      allLayersSorted,
      restoreDrawingTool,
      selectLayer,
      selectLayerForPlacement,
      setViewMode,
      warmSmartFillLookup,
    ],
  );

  const handleCompositeRestore = useCallback(() => {
    setIsFocusPlacementActive(false);
    setSelectedTool("gallery");
    setViewMode("composite");
  }, [setViewMode]);

  const handleDiscardExit = useCallback(async () => {
    reset();
    await clearAllLocalUploads();
    await queryClient.invalidateQueries({
      queryKey: apiQueryKeys.assets.localUploads,
    });
    router.replace("/(tabs)/home");
  }, [reset, queryClient, router]);

  const handleConfirmDiscardExit = useCallback(() => {
    Alert.alert(
      "Discard changes?",
      "If you leave now, your current canvas changes will be discarded.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: handleDiscardExit,
        },
      ],
    );
  }, [handleDiscardExit]);

  const handleEditorBackPress = useCallback(() => {
    if (isAssetPickerVisibleRef.current) {
      dismissAssetPicker();
      return true;
    }

    if (showPreviewModal) {
      setShowPreviewModal(false);
      return true;
    }

    if (signatureModalVisible) {
      setSignatureModalVisible(false);
      return true;
    }

    if (patternModalVisible) {
      setPatternModalVisible(false);
      return true;
    }

    if (colorPickerVisible) {
      setColorPickerVisible(false);
      return true;
    }

    if (selectedPremiumAsset) {
      handleClosePremiumAsset();
      return true;
    }

    if (viewMode === "single") {
      handleCompositeRestore();
      return true;
    }

    if (selectedLayerId) {
      selectLayer(null);
      return true;
    }

    handleConfirmDiscardExit();
    return true;
  }, [
    colorPickerVisible,
    dismissAssetPicker,
    handleClosePremiumAsset,
    handleCompositeRestore,
    handleConfirmDiscardExit,
    patternModalVisible,
    selectedPremiumAsset,
    showPreviewModal,
    signatureModalVisible,
    selectedLayerId,
    selectLayer,
    viewMode,
  ]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (Platform.OS !== "android") {
          return false;
        }

        return handleEditorBackPress();
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, [handleEditorBackPress]),
  );

  useFocusEffect(
    useCallback(() => {
      // Refresh local uploads on focus to catch any changes made in other screens
      void queryClient.invalidateQueries({
        queryKey: apiQueryKeys.assets.localUploads,
      });
    }, [queryClient]),
  );

  const handleExitFocusPlacement = useCallback(() => {
    if (!isFocusPlacementActive) {
      return;
    }

    setIsFocusPlacementActive(false);
    setSelectedTool(lastDrawingToolRef.current);
  }, [isFocusPlacementActive]);

  const handleClearSelection = useCallback(() => {
    if (viewMode !== "composite") {
      return;
    }

    setHandModeLayerIds(new Set());
    selectLayer(null);
    setIsFocusPlacementActive(false);
  }, [selectLayer, setHandModeLayerIds, viewMode]);

  const handleClearSelectionToDraw = useCallback(() => {
    if (viewMode !== "composite") {
      return;
    }

    setHandModeLayerIds(new Set());
    selectLayer(null);
    setIsFocusPlacementActive(false);
  }, [selectLayer, setHandModeLayerIds, viewMode]);

  const handleZoomReset = useCallback(() => {
    setZoomResetKey((prev) => prev + 1);
  }, []);

  const handleCloseColorPicker = useCallback(() => {
    setColorPickerVisible(false);
  }, []);

  const handleClosePatternModal = useCallback(() => {
    setPatternModalVisible(false);
  }, []);

  const handleCloseSignatureModal = useCallback(() => {
    setSignatureModalVisible(false);
  }, []);

  const handleApplyPattern = useCallback(
    (preset: PatternPreset) => {
      setSelectedPatternId(preset.id);
      const patternUri = RNImage.resolveAssetSource(preset.source).uri;

      setBrushForActiveLayer({
        kind: "pattern",
        color: brush.color,
        solidMode: brush.solidMode,
        patternUri,
      });
      setPatternModalVisible(false);
    },
    [brush.color, brush.solidMode, setBrushForActiveLayer],
  );

  const handleApplySignature = useCallback(
    async (selection: SignatureSelection) => {
      setSelectedSignatureId(selection.id);
      setSignatureModalVisible(false);

      const existingSignatureLayer = allLayersSorted.find((layer) =>
        layer.id.startsWith("signature-"),
      );

        if (selection.isTextAsLayer && selection.textLayerUri) {
          if (!hasMainLayer) {
            const overlayLayers = allLayersSorted.filter(
              (layer) => layer.id !== "main-image",
          );
          setLayers(
            [createMainImageLayer(selection.textLayerUri), ...overlayLayers],
            selectedLayerId,
          );
          setSelectedTool("gallery");
          setIsFocusPlacementActive(false);
          warmSmartFillLookup(selection.textLayerUri);
          setViewMode("composite");
          return;
          }

          try {
            const signatureImageLayer = await createSignatureImageLayer(
              selection.textLayerUri,
              existingSignatureLayer?.zIndex ?? allLayersSorted.length + 1,
              layers,
            );

            setHandModeLayerIds((prev) => {
              const next = new Set(prev);
              if (existingSignatureLayer) {
                next.delete(existingSignatureLayer.id);
              }
              next.delete(signatureImageLayer.id);
              return next;
            });

            if (existingSignatureLayer) {
              updateLayer(existingSignatureLayer.id, {
                type: "image",
                uri: signatureImageLayer.uri,
                text: undefined,
                fontFamily: undefined,
                fontSize: undefined,
                color: undefined,
                width: signatureImageLayer.width,
                height: signatureImageLayer.height,
                x: signatureImageLayer.x,
                y: signatureImageLayer.y,
                opacity: signatureImageLayer.opacity,
                scale: signatureImageLayer.scale,
                rotation: signatureImageLayer.rotation,
              });
              selectLayerForPlacement(existingSignatureLayer.id);
            } else {
              addLayer(signatureImageLayer);
              selectLayerForPlacement(signatureImageLayer.id);
            }
            warmSmartFillLookup(signatureImageLayer.uri);
          } catch (error) {
            console.error("Failed to create sub image from text layer:", error);
          }
          return;
        }

      if (selection.isArtistPreset && selection.presetImageSource) {
        const presetUri = RNImage.resolveAssetSource(
          selection.presetImageSource,
        ).uri;

        if (!presetUri) {
          return;
        }

        try {
          const signatureImageLayer = await createSignatureImageLayer(
            presetUri,
            existingSignatureLayer?.zIndex ?? allLayersSorted.length + 1,
            layers,
          );

          setHandModeLayerIds((prev) => {
            const next = new Set(prev);
            if (existingSignatureLayer) {
              next.delete(existingSignatureLayer.id);
            }
            next.delete(signatureImageLayer.id);
            return next;
          });

          if (existingSignatureLayer) {
            updateLayer(existingSignatureLayer.id, {
              type: "image",
              uri: signatureImageLayer.uri,
              text: undefined,
              fontFamily: undefined,
              fontSize: undefined,
              color: undefined,
              width: signatureImageLayer.width,
              height: signatureImageLayer.height,
              x: signatureImageLayer.x,
              y: signatureImageLayer.y,
              opacity: signatureImageLayer.opacity,
              scale: signatureImageLayer.scale,
              rotation: signatureImageLayer.rotation,
            });
            selectLayerForPlacement(existingSignatureLayer.id);
          } else {
            addLayer(signatureImageLayer);
            selectLayerForPlacement(signatureImageLayer.id);
          }
        } catch (error) {
          console.error("Failed to create artist signature image layer:", error);
        }
        return;
      }

      const signatureLayer = createSignatureTextLayer(
        selection,
        existingSignatureLayer?.zIndex ?? allLayersSorted.length + 1,
        layers,
      );

      setSelectedSignatureId(selection.id);
      setHandModeLayerIds((prev) => {
        const next = new Set(prev);
        if (existingSignatureLayer) {
          next.delete(existingSignatureLayer.id);
        }
        next.delete(signatureLayer.id);
        return next;
      });

      if (existingSignatureLayer) {
        updateLayer(existingSignatureLayer.id, {
          type: "text",
          uri: undefined,
          text: signatureLayer.text,
          fontFamily: signatureLayer.fontFamily,
          fontSize: signatureLayer.fontSize,
          color: existingSignatureLayer.color ?? signatureLayer.color,
          width: signatureLayer.width,
          height: signatureLayer.height,
          x: signatureLayer.x,
          y: signatureLayer.y,
        });
        selectLayerForPlacement(existingSignatureLayer.id);
      } else {
        addLayer(signatureLayer);
        selectLayerForPlacement(signatureLayer.id);
      }
    },
    [
      addLayer,
      allLayersSorted,
      selectLayerForPlacement,
      updateLayer,
      hasMainLayer,
      setLayers,
      selectedLayerId,
      setViewMode,
      warmSmartFillLookup,
      layers,
    ],
  );

  const handleSnapshotAnimDone = useCallback(() => {
    setShowSnapshotAnim(false);
  }, []);

  const handleClosePreviewModal = useCallback(() => {
    setShowPreviewModal(false);
  }, []);

  const handleSelectGradient = useCallback(() => {}, []);

  const snapshotTargetPosition = useMemo(
    () => ({ x: SCREEN_WIDTH - 60, y: SCREEN_HEIGHT - 100 }),
    [],
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.workspaceRail}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              Virtual Creativity
            </Text>
          </View>

          <TopBar
            onUndo={handleUndo}
            onRedo={handleRedo}
            onBringToFront={handleBringToFront}
            onSendToBack={handleSendToBack}
            onZoomToggle={handleZoomToggle}
            onZoomReset={handleZoomReset}
            onDelete={handleDelete}
            onNext={handleNext}
            canUndo={history.past.length > 0}
            canRedo={history.future.length > 0}
            hasSelection={!!selectedSubLayerId}
            canReorder={!!activeOrderLayerId}
            canDelete={canDeleteLayer}
            isZoomActive={isZoomMode}
            hideNext={viewMode === "single" || layers.length === 0}
            horizontalInset={0}
          />

          <View
            style={styles.canvasRegion}
            ref={viewShotRef}
            collapsable={false}
          >
            <CanvasViewer
              layers={displayedLayers}
              activeLayerId={activeCanvasLayerId}
              selectedLayerId={selectedLayerId}
              onSelectLayer={handleSelectCanvasLayer}
              onLongPressLayer={
                isLayerSelectionMode ? handleLayerLongPress : undefined
              }
              onClearSelection={handleClearSelection}
              onClearSelectionToDraw={handleClearSelectionToDraw}
              onExitFocusPlacement={handleExitFocusPlacement}
              isZoomMode={isZoomMode}
              currentColor={brush.color}
              zoomResetKey={zoomResetKey}
              currentBrushKind={brush.kind}
              currentPatternUri={brush.patternUri}
              currentSolidMode={brush.solidMode}
              handModeLayerIds={handModeLayerIds}
              layerSelectionMode={isLayerSelectionMode}
              focusPlacementEnabled={false}
              hideSelectionUI={isZoomMode || isCanvasCaptureInProgress}
              smartFillSpaces={smartFillSpacesByLayerId}
            />
          </View>

          {stripLayers.length > 0 ? (
            <LayerStrip
              layers={stripLayers}
              handModeLayerIds={handModeLayerIds}
              onToggleHandMode={handleToggleHandMode}
              onSelectLayer={handleOpenLayerEditor}
              isZoomMode={isZoomMode}
              horizontalInset={0}
            />
          ) : null}

          <BottomBar
            onGallery={handleGallery}
            onPalette={handlePalette}
            onPattern={handlePattern}
            onStroke={handleStroke}
            onPreview={handlePreview}
            onPreviewLongPress={handlePreviewLongPress}
            onCompositeRestore={handleCompositeRestore}
            selectedTool={selectedTool}
            previewBadge={snapshots.length}
            mode={viewMode === "single" ? "single" : "default"}
            layers={bottomBarLayers}
            horizontalInset={0}
          />
        </View>

        <UploadAssetSheet
          modalRef={assetPickerModalRef}
          assets={uploadSheetAssets}
          isLoading={isUploadSheetLoading}
          isError={isUploadSheetError}
          bottomInset={bottomInset}
          onClose={handleCloseAssetPicker}
          onDone={
            isPremiumPickerModalFlow
              ? handleUploadPremiumAssetPress
              : handleApplyUploadAsset
          }
          onRetry={refetchUploadSheetAssets}
          sourceOptions={uploadSourceOptions}
          selectedSourceId={uploadSelectedSourceId}
          onSelectSource={setUploadSelectedSourceId}
          categoryOptions={uploadCategoryOptions}
          selectedCategoryId={uploadSelectedCategoryId}
          onSelectCategory={setUploadSelectedCategoryId}
          onShufflePress={onShufflePressSheet}
          onUploadPress={handleStartUploadFlow}
          isUploadActionBusy={isPickingImage}
          premiumActionMode={PREMIUM_PICKER_ENTRY_MODE}
          isPremiumAssetUnlocked={isPremiumAssetUnlocked}
          getPremiumPriceLabelForAsset={getPremiumPriceLabelForAsset}
          onSelectedAssetChange={(asset) => {
            void preloadAssetProduct(asset);
          }}
          onFreePremiumAsset={handleFreePremiumAsset}
          onBuyPremiumAsset={handlePremiumAsset}
          isFreePremiumActionBusy={isFreePremiumActionBusy}
          isPremiumActionBusy={isPremiumActionBusy}
          premiumPriceLabel={premiumPriceLabel}
        />

        <ImageUploadFlowModal {...modalProps} />

        {isPremiumPickerModalFlow ? (
          <PremiumAssetModal
            asset={selectedPremiumAsset}
            visible={!!selectedPremiumAsset}
            onClose={handleClosePremiumAsset}
            onFreePress={(asset: GridAssetItem) => {
              void handleFreePremiumAsset(asset as CreateFlowPickerAssetItem);
            }}
            onPremiumPress={(asset: GridAssetItem) => {
              void handlePremiumAsset(asset as CreateFlowPickerAssetItem);
            }}
            freeDisabled={isFreePremiumActionBusy}
            premiumDisabled={isPremiumActionBusy}
            premiumPriceLabel={premiumPriceLabel}
          />
        ) : null}

        <ColorPickerModal
          visible={colorPickerVisible}
          onClose={handleCloseColorPicker}
          onSelectColor={onSelectColor}
          initialColor={brush.color}
          initialSolidMode={brush.solidMode}
          mode={pickerMode}
          onSelectGradient={handleSelectGradient}
        />

        <PatternModal
          visible={patternModalVisible}
          selectedPatternId={selectedPatternId}
          onClose={handleClosePatternModal}
          onApply={handleApplyPattern}
        />

        <SignatureModal
          visible={signatureModalVisible}
          selectedSignatureId={selectedSignatureId}
          defaultName="AR Chitram"
          onClose={handleCloseSignatureModal}
          onApply={handleApplySignature}
        />

        <ScreenshotCaptureAnimation
          visible={showSnapshotAnim}
          imageUri={snapshotUri}
          targetPosition={snapshotTargetPosition}
          onAnimationComplete={handleSnapshotAnimDone}
        />

        <CapturePreviewModal
          visible={showPreviewModal}
          onClose={handleClosePreviewModal}
          snapshots={snapshots}
          onDelete={removeSnapshot}
          onUpdateSnapshots={setSnapshots}
          onReorder={() => {}}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  workspaceRail: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: HORIZONTAL_GUTTER,
    paddingBottom: WORKSPACE_BOTTOM_PADDING,
    gap: WORKSPACE_GAP,
  },
  header: {
    paddingTop: 2,
    paddingBottom: 0,
  },
  canvasRegion: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    alignSelf: "center",
    overflow: "hidden",
  },
  canvasLoaderOnly: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
  },
});
