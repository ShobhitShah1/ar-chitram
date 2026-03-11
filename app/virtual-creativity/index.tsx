import { ColorPickerModal } from "@/components/color-picker-modal";
import { UploadAssetSheet } from "@/components/virtual-creativity/upload-asset-sheet";
import {
  CapturePreviewModal,
  Snapshot,
} from "@/components/drawing/capture-preview-modal";
import ScreenshotCaptureAnimation from "@/components/drawing/screenshot-capture-animation";
import {
  BottomBar,
  ToolType,
} from "@/components/virtual-creativity/bottom-bar";
import { CanvasViewer } from "@/components/virtual-creativity/canvas-viewer";
import {
  type PatternPreset,
  type SignatureSelection,
} from "@/components/virtual-creativity/editor-presets";
import { LayerStrip } from "@/components/virtual-creativity/layer-strip";
import { PatternModal } from "@/components/virtual-creativity/pattern-modal";
import { SignatureModal } from "@/components/virtual-creativity/signature-modal";
import { TopBar } from "@/components/virtual-creativity/top-bar";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import {
  type CreateFlowPickerAssetItem,
  useCreateFlowAssetPicker,
} from "@/hooks/api/use-tab-assets-api";
import {
  useBrush,
  useCanvasInitialization,
} from "@/hooks/use-virtual-creativity-canvas";
import { primeSmartFillLookup } from "@/services/smart-fill-path-service";
import { normalizeStoryImageUri } from "@/services/story-media-service";
import {
  createMainImageLayer,
  createSubImageLayer,
} from "@/services/virtual-layer-service";
import {
  VirtualLayer,
  useVirtualCreativityStore,
} from "@/store/virtual-creativity-store";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utiles/story-frame";
import * as ImageManipulator from "expo-image-manipulator";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image as RNImage,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const EMPTY_LAYERS: VirtualLayer[] = [];
const HORIZONTAL_GUTTER = 16;
const CANVAS_BOTTOM_GAP = 10;

const getInitialLayers = (): VirtualLayer[] => [];

export default function VirtualCreativityScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const assetPickerModalRef = useRef<BottomSheetModal | null>(null);
  const lastDrawingToolRef = useRef<ToolType>("palette");

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
    bringToFront,
    sendToBack,
    selectedLayerId,
    selectLayer,
    pendingUploadUris,
    clearPendingUploadUris,
  } = useVirtualCreativityStore();

  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<"color" | "gradient">("color");
  const [selectedTool, setSelectedTool] = useState<ToolType>("palette");
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

  const [signatureSelection, setSignatureSelection] =
    useState<SignatureSelection | null>(null);
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

  const compositeVisibleLayers = useMemo(() => allLayersSorted, [allLayersSorted]);

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
  const isSingleSubLayerView =
    viewMode === "single" && !!selectedSubLayerId;
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
    () => allLayersSorted.filter((layer) => layer.id !== "main-image"),
    [allLayersSorted],
  );
  const bottomBarLayers = useMemo(
    () => (viewMode === "single" ? compositeVisibleLayers : EMPTY_LAYERS),
    [compositeVisibleLayers, viewMode],
  );

  const waitForNextFrame = useCallback(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
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

  const handleUndo = useCallback(() => undo(), [undo]);
  const handleRedo = useCallback(() => redo(), [redo]);

  const handleBringToFront = useCallback(() => {
    if (activeOrderLayerId) {
      bringToFront(activeOrderLayerId);
    }
  }, [activeOrderLayerId, bringToFront]);

  const handleSendToBack = useCallback(() => {
    if (activeOrderLayerId) {
      sendToBack(activeOrderLayerId);
    }
  }, [activeOrderLayerId, sendToBack]);

  const handleZoomToggle = useCallback(() => {
    setIsZoomMode((prev) => !prev);
  }, []);

  const handleDelete = useCallback(() => {
    if (selectedSubLayerId) {
      removeLayer(selectedSubLayerId);
      setIsFocusPlacementActive(false);
      setViewMode("composite");
    }
  }, [removeLayer, selectedSubLayerId, setViewMode]);

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
        const params: Record<string, string> = { imageUri: uri };

        if (signatureSelection) {
          params.signatureText = signatureSelection.value;
          params.signatureFont = signatureSelection.fontFamily;
        }

        router.push({
          pathname: "/virtual-creativity/preview",
          params,
        });
      }
    } catch (error) {
      console.error("Failed to capture snapshot for next step:", error);
    }
  }, [captureCanvasSnapshot, router, signatureSelection, viewMode]);

  const handleCloseAssetPicker = useCallback(() => {
    assetPickerModalRef.current?.dismiss();
  }, []);

  const handleGallery = useCallback(() => {
    setSelectedTool("gallery");
    setColorPickerVisible(false);
    setPatternModalVisible(false);
    setSignatureModalVisible(false);
    assetPickerModalRef.current?.present();
  }, []);

  const handleApplyUploadAsset = useCallback(
    async (item: CreateFlowPickerAssetItem) => {
      try {
        if (!hasMainLayer) {
          setLayers([createMainImageLayer(item.image)], null);
          selectLayer(null);
          restoreDrawingTool();
          setIsFocusPlacementActive(false);
          warmSmartFillLookup(item.image);
          setViewMode("composite");
        } else {
          const subLayer = await createSubImageLayer(
            item.image,
            allLayersSorted.length + 1,
          );
          addLayer(subLayer);
          selectLayer(subLayer.id);
          restoreDrawingTool();
          setIsFocusPlacementActive(false);
          warmSmartFillLookup(subLayer.uri);
          setViewMode("single");
        }

        assetPickerModalRef.current?.dismiss();
      } catch (error) {
        console.error("Failed to apply upload asset:", error);
      }
    },
    [addLayer, allLayersSorted.length, hasMainLayer, restoreDrawingTool, selectLayer, setLayers, setViewMode, warmSmartFillLookup],
  );

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

  const handleOpenLayerEditor = useCallback(
    (id: string) => {
      const targetLayer = allLayersSorted.find((layer) => layer.id === id);
      selectLayer(id);
      setIsFocusPlacementActive(false);
      restoreDrawingTool();
      warmSmartFillLookup(targetLayer?.uri);
      setViewMode("single");
    },
    [allLayersSorted, restoreDrawingTool, selectLayer, setViewMode, warmSmartFillLookup],
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

  const handleApplySignature = useCallback((selection: SignatureSelection) => {
    setSelectedSignatureId(selection.id);
    setSignatureSelection(selection);
    setSignatureModalVisible(false);
  }, []);

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
          horizontalInset={HORIZONTAL_GUTTER}
        />

        <View style={styles.canvasRegion} ref={viewShotRef} collapsable={false}>
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
              onClearSelection={handleClearSelection}
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

        <LayerStrip
          layers={stripLayers}
          selectedLayerId={selectedSubLayerId}
          onSelectLayer={handleOpenLayerEditor}
          horizontalInset={HORIZONTAL_GUTTER}
        />

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
          horizontalInset={HORIZONTAL_GUTTER}
        />

        <UploadAssetSheet
          modalRef={assetPickerModalRef}
          assets={uploadSheetAssets}
          isLoading={isUploadSheetLoading}
          isError={isUploadSheetError}
          onClose={handleCloseAssetPicker}
          onDone={handleApplyUploadAsset}
          onRetry={refetchUploadSheetAssets}
          sourceOptions={uploadSourceOptions}
          selectedSourceId={uploadSelectedSourceId}
          onSelectSource={setUploadSelectedSourceId}
          categoryOptions={uploadCategoryOptions}
          selectedCategoryId={uploadSelectedCategoryId}
          onSelectCategory={setUploadSelectedCategoryId}
        />
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
  header: {
    paddingHorizontal: HORIZONTAL_GUTTER,
    paddingTop: 8,
    paddingBottom: 4,
  },
  canvasRegion: {
    flex: 1,
    marginHorizontal: HORIZONTAL_GUTTER,
    marginBottom: CANVAS_BOTTOM_GAP,
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