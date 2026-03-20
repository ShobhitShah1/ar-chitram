import { ColorPickerModal } from "@/features/virtual-creativity/components/color-picker-modal";
import { ImageUploadFlowModal } from "@/features/virtual-creativity/components/image-upload-flow-modal";
import { UploadAssetSheet } from "@/features/virtual-creativity/components/upload-asset-sheet";
import {
  CapturePreviewModal,
  Snapshot,
} from "@/components/drawing/capture-preview-modal";
import ScreenshotCaptureAnimation from "@/components/drawing/screenshot-capture-animation";
import {
  BottomBar,
  ToolType,
} from "@/features/virtual-creativity/components/bottom-bar";
import { CanvasViewer } from "@/features/virtual-creativity/components/canvas-viewer";
import {
  type PatternPreset,
  type SignatureSelection,
} from "@/features/virtual-creativity/constants/editor-presets";
import { LayerStrip } from "@/features/virtual-creativity/components/layer-strip";
import { PatternModal } from "@/features/virtual-creativity/components/pattern-modal";
import { SignatureModal } from "@/features/virtual-creativity/components/signature-modal";
import { TopBar } from "@/features/virtual-creativity/components/top-bar";
import { fetchLocalUploadTabAssets } from "@/features/virtual-creativity/services/local-upload-asset-service";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import {
  type CreateFlowPickerAssetItem,
  useCreateFlowAssetPicker,
} from "@/hooks/api/use-tab-assets-api";
import { apiQueryKeys } from "@/services/api/query-keys";
import { useImageUploadFlow } from "@/features/virtual-creativity/hooks/use-image-upload-flow";
import {
  useBrush,
  useCanvasInitialization,
} from "@/features/virtual-creativity/hooks/use-virtual-creativity-canvas";
import { primeSmartFillLookup } from "@/features/virtual-creativity/services/smart-fill-path-service";
import { normalizeStoryImageUri } from "@/services/story-media-service";
import {
  createMainImageLayer,
  createSignatureTextLayer,
  createSubImageLayer,
} from "@/features/virtual-creativity/services/virtual-layer-service";
import {
  VirtualLayer,
  useVirtualCreativityStore,
} from "@/features/virtual-creativity/store/virtual-creativity-store";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utils/story-frame";
import * as ImageManipulator from "expo-image-manipulator";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Dimensions,
  Image as RNImage,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const EMPTY_LAYERS: VirtualLayer[] = [];
const HORIZONTAL_GUTTER = 16;
const WORKSPACE_GAP = 10;
const WORKSPACE_BOTTOM_PADDING = 8;

const getInitialLayers = (): VirtualLayer[] => [];

export default function VirtualCreativityScreen() {
  const { theme } = useTheme();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const router = useRouter();
  const assetPickerModalRef = useRef<BottomSheetModal | null>(null);
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
  const [zoomResetKey, setZoomResetKey] = useState(0);
  const [isCanvasCaptureInProgress, setIsCanvasCaptureInProgress] =
    useState(false);

  const viewShotRef = useRef<View>(null);
  const [snapshotUri, setSnapshotUri] = useState<string | null>(null);
  const [showSnapshotAnim, setShowSnapshotAnim] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [isSmartFillPreloading, setIsSmartFillPreloading] = useState(true);
  const preloadedSmartFillUrisRef = useRef<Set<string>>(new Set());
  const preloadJobRef = useRef(0);

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

  React.useEffect(() => {
    if (!mainImageUri) {
      setIsSmartFillPreloading(false);
      return;
    }

    if (preloadedSmartFillUrisRef.current.has(mainImageUri)) {
      setIsSmartFillPreloading(false);
      return;
    }

    let cancelled = false;
    const jobId = ++preloadJobRef.current;
    setIsSmartFillPreloading(true);

    void primeSmartFillLookup({ imageUri: mainImageUri })
      .then(() => {
        if (cancelled || preloadJobRef.current !== jobId) {
          return;
        }

        preloadedSmartFillUrisRef.current.add(mainImageUri);
      })
      .finally(() => {
        if (!cancelled && preloadJobRef.current === jobId) {
          setIsSmartFillPreloading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mainImageUri]);

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
  const brushTargetLayerId = useMemo(
    () =>
      isSingleSubLayerView
        ? selectedSubLayerId
        : hasMainLayer
          ? "main-image"
          : null,
    [hasMainLayer, isSingleSubLayerView, selectedSubLayerId],
  );
  const activeCanvasLayerId = useMemo(() => {
    if (selectedTool === "gallery" || isFocusPlacementActive) {
      return null;
    }

    return brushTargetLayerId;
  }, [brushTargetLayerId, isFocusPlacementActive, selectedTool]);
  const activeOrderLayerId = selectedSubLayerId;
  const canDeleteLayer = !!selectedSubLayerId;

  const defaultBrushColor =
    typeof theme.accent === "string" && theme.accent.startsWith("#")
      ? theme.accent
      : "#3259F4";

  const { brush, setBrushForActiveLayer, onSelectColor } = useBrush(
    brushTargetLayerId,
    bringToFront,
    defaultBrushColor,
  );

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

    void primeSmartFillLookup({ imageUri }).catch(() => {
      // Warm cache in the background without interrupting the current flow.
    });
  }, []);

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

      setLayers(
        [...layers, ...uploadLayers],
        uploadLayers[0]?.id ?? null,
      );
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
    setViewMode,
    storedUploadAssetsData,
    warmSmartFillLookup,
  ]);

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

    try {
      const uri = await captureCanvasSnapshot(1);
      if (uri) {
        router.push({
          pathname: "/virtual-creativity/preview",
          params: { imageUri: uri },
        });
      }
    } catch (error) {
      console.error("Failed to capture snapshot for next step:", error);
    }
  }, [captureCanvasSnapshot, router, viewMode]);

  const handleGallery = useCallback(() => {
    const shouldOpenAssetPicker =
      !hasMainLayer || (viewMode === "composite" && selectedTool === "gallery");

    setSelectedTool("gallery");
    setIsFocusPlacementActive(false);
    setColorPickerVisible(false);
    setPatternModalVisible(false);
    setSignatureModalVisible(false);

    if (shouldOpenAssetPicker) {
      assetPickerModalRef.current?.present();
    }
  }, [hasMainLayer, selectedTool, viewMode]);

  const selectLayerForPlacement = useCallback(
    (layerId: string) => {
      selectLayer(layerId);
      setSelectedTool("gallery");
      setIsFocusPlacementActive(false);
      setViewMode("composite");
    },
    [selectLayer, setViewMode],
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
        await applyImageToCanvas(item.image);
        assetPickerModalRef.current?.dismiss();
      } catch (error) {
        console.error("Failed to apply upload asset:", error);
      }
    },
    [applyImageToCanvas],
  );

  const { startUploadFlow, isPickingImage, modalProps } = useImageUploadFlow({
    title: "Upload To Canvas",
    description:
      "Pick an image, preview the background removal, then add that version to your canvas.",
    doneLabel: hasMainLayer ? "Add to Canvas" : "Use as Main Image",
    onComplete: async ({ finalUri }) => {
      try {
        await applyImageToCanvas(finalUri);
        assetPickerModalRef.current?.dismiss();
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
    assetPickerModalRef.current?.dismiss();
  }, [isPickingImage]);

  const handleCloseAssetPicker = useCallback(() => {
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
    }
    setIsFocusPlacementActive(false);
    setSelectedTool("palette");
    setSelectedPatternId(null);
    setPickerMode("color");
    setPatternModalVisible(false);
    setSignatureModalVisible(false);
    setColorPickerVisible(true);
  }, [selectLayer, viewMode]);

  const handlePattern = useCallback(() => {
    lastDrawingToolRef.current = "pattern";
    if (viewMode === "composite") {
      selectLayer(null);
    }
    setIsFocusPlacementActive(false);
    setSelectedTool("pattern");
    setColorPickerVisible(false);
    setSignatureModalVisible(false);
    setPatternModalVisible(true);
  }, [selectLayer, viewMode]);

  const handleStroke = useCallback(() => {
    lastDrawingToolRef.current = "stroke";
    if (viewMode === "composite") {
      selectLayer(null);
    }
    setIsFocusPlacementActive(false);
    setSelectedTool("stroke");
    setColorPickerVisible(false);
    setPatternModalVisible(false);
    setSignatureModalVisible(true);
  }, [selectLayer, viewMode]);

  const handlePreview = useCallback(async () => {
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
    }
  }, [addSnapshot, captureCanvasSnapshot]);

  const handlePreviewLongPress = useCallback(() => {
    setShowPreviewModal(true);
  }, []);

  const handleSelectCanvasLayer = useCallback(
    (id: string) => {
      selectLayer(id);
      setSelectedTool("gallery");
      setIsFocusPlacementActive(false);
      setViewMode("composite");
    },
    [selectLayer, setViewMode],
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

    selectLayer(null);
    setIsFocusPlacementActive(false);
    setSelectedTool("gallery");
  }, [selectLayer, viewMode]);

  const handleClearSelectionToDraw = useCallback(() => {
    if (viewMode !== "composite") {
      return;
    }

    selectLayer(null);
    setIsFocusPlacementActive(false);
    restoreDrawingTool();
  }, [restoreDrawingTool, selectLayer, viewMode]);

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
    (selection: SignatureSelection) => {
      const existingSignatureLayer = allLayersSorted.find(
        (layer) => layer.type === "text",
      );
      const signatureLayer = createSignatureTextLayer(
        selection,
        existingSignatureLayer?.zIndex ?? allLayersSorted.length + 1,
      );

      setSelectedSignatureId(selection.id);

      if (existingSignatureLayer) {
        updateLayer(existingSignatureLayer.id, {
          text: signatureLayer.text,
          fontFamily: signatureLayer.fontFamily,
          fontSize: signatureLayer.fontSize,
          color: existingSignatureLayer.color ?? signatureLayer.color,
          width: signatureLayer.width,
          height: signatureLayer.height,
        });
        selectLayerForPlacement(existingSignatureLayer.id);
      } else {
        addLayer(signatureLayer);
        selectLayerForPlacement(signatureLayer.id);
      }

      setSignatureModalVisible(false);
    },
    [addLayer, allLayersSorted, selectLayerForPlacement, updateLayer],
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
            hideNext={viewMode === "single"}
            horizontalInset={0}
          />

          <View
            style={styles.canvasRegion}
            ref={viewShotRef}
            collapsable={false}
          >
            {isSmartFillPreloading ? (
              <View style={styles.canvasLoaderOnly}>
                <ActivityIndicator color="#000000" size="large" />
              </View>
            ) : (
              <CanvasViewer
                layers={displayedLayers}
                activeLayerId={activeCanvasLayerId}
                selectedLayerId={selectedSubLayerId}
                onSelectLayer={
                  viewMode === "composite" ? handleSelectCanvasLayer : undefined
                }
                onLongPressLayer={handleLayerLongPress}
                onClearSelection={handleClearSelection}
                onClearSelectionToDraw={handleClearSelectionToDraw}
                onExitFocusPlacement={handleExitFocusPlacement}
                isZoomMode={isZoomMode}
                currentColor={brush.color}
                zoomResetKey={zoomResetKey}
                currentBrushKind={brush.kind}
                currentPatternUri={brush.patternUri}
                currentSolidMode={brush.solidMode}
                subLayerGesturesEnabled={
                  viewMode === "composite" &&
                  selectedTool === "gallery" &&
                  !!selectedSubLayerId &&
                  !isZoomMode
                }
                focusPlacementEnabled={false}
                hideSelectionUI={isZoomMode || isCanvasCaptureInProgress}
              />
            )}
          </View>

          {stripLayers.length > 0 ? (
            <LayerStrip
              layers={stripLayers}
              selectedLayerId={selectedSubLayerId}
              onSelectLayer={handleOpenLayerEditor}
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
          onDone={handleApplyUploadAsset}
          onRetry={refetchUploadSheetAssets}
          sourceOptions={uploadSourceOptions}
          selectedSourceId={uploadSelectedSourceId}
          onSelectSource={setUploadSelectedSourceId}
          categoryOptions={uploadCategoryOptions}
          selectedCategoryId={uploadSelectedCategoryId}
          onSelectCategory={setUploadSelectedCategoryId}
          onUploadPress={handleStartUploadFlow}
          isUploadActionBusy={isPickingImage}
        />
        <ImageUploadFlowModal {...modalProps} />
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
    paddingTop: 8,
    paddingBottom: 2,
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
    fontSize: 20,
    fontFamily: FontFamily.bold,
  },
});
