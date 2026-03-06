import { ColorPickerModal } from "@/components/color-picker-modal";
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
import { normalizeStoryImageUri } from "@/services/story-media-service";
import {
  BrushKind,
  VirtualLayer,
  useVirtualCreativityStore,
} from "@/store/virtual-creativity-store";
import {
  BrushState,
  useBrush,
  useCanvasInitialization,
} from "@/hooks/use-virtual-creativity-canvas";
import { pickImageUris } from "@/utiles/image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { STORY_FRAME_HEIGHT, STORY_FRAME_WIDTH } from "@/utiles/story-frame";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Image as RNImage,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import {
  animal_1,
  animal_2,
  animal_3,
  animal_4,
  animal_5,
  animal_6,
  animal_7,
  test_deer,
} from "@/assets/images";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const EMPTY_LAYERS: VirtualLayer[] = [];

const MAIN_IMAGE_URI = RNImage.resolveAssetSource(test_deer).uri;
const SUB_IMAGE_URIS = [
  animal_1,
  animal_2,
  animal_3,
  animal_4,
  animal_5,
  animal_6,
  animal_7,
].map((asset) => RNImage.resolveAssetSource(asset).uri);

const getInitialLayers = (): VirtualLayer[] => {
  const subLayers = SUB_IMAGE_URIS.map((uri, index) => ({
    id: `animal-${index + 1}`,
    type: "image" as const,
    uri,
    x: 0,
    y: 0,
    width: STORY_FRAME_WIDTH,
    height: STORY_FRAME_HEIGHT,
    rotation: 0,
    scale: 1,
    opacity: 1,
    zIndex: index + 1,
  }));

  return [
    ...subLayers,
    {
      id: "main-image",
      type: "image",
      uri: MAIN_IMAGE_URI,
      x: 0,
      y: 0,
      width: STORY_FRAME_WIDTH,
      height: STORY_FRAME_HEIGHT,
      rotation: 0,
      scale: 1,
      opacity: 1,
      zIndex: subLayers.length + 1,
    },
  ];
};

export default function VirtualCreativityScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  // Store state
  const {
    layers,
    snapshots,
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
    addImageLayersFromUris,
  } = useVirtualCreativityStore();

  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<"color" | "gradient">("color");
  const [selectedTool, setSelectedTool] = useState<ToolType>("gallery");
  const [patternModalVisible, setPatternModalVisible] = useState(false);
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(
    null,
  );
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(
    null,
  );

  // Canvas & Zoom State
  const [isZoomMode, setIsZoomMode] = useState(false);
  const [zoomResetKey, setZoomResetKey] = useState(0);

  // Snapshot State
  const viewShotRef = useRef<View>(null);
  const [snapshotUri, setSnapshotUri] = useState<string | null>(null);
  const [showSnapshotAnim, setShowSnapshotAnim] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [compositePreviewLayers, setCompositePreviewLayers] = useState<
    VirtualLayer[]
  >([]);

  const [signatureSelection, setSignatureSelection] =
    useState<SignatureSelection | null>(null);

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
    }
  }, [viewMode, selectedLayerId]);

  const allLayersSorted = useMemo(
    () => [...layers].sort((a, b) => a.zIndex - b.zIndex),
    [layers],
  );
  const compositeVisibleLayers = useMemo(
    () =>
      allLayersSorted.filter((layer) => {
        if (layer.id === "main-image") return true;
        return (layer.paths?.length ?? 0) > 0;
      }),
    [allLayersSorted],
  );

  const hasMainLayer = useMemo(
    () => layers.some((layer) => layer.id === "main-image"),
    [layers],
  );
  const activeEditableLayerId = useMemo(
    () =>
      viewMode === "single"
        ? selectedLayerId
        : hasMainLayer
          ? "main-image"
          : null,
    [hasMainLayer, selectedLayerId, viewMode],
  );
  const activeOrderLayerId =
    viewMode === "single"
      ? selectedLayerId
      : hasMainLayer
        ? "main-image"
        : null;
  const canDeleteLayer =
    viewMode === "single" &&
    !!selectedLayerId &&
    selectedLayerId !== "main-image";

  const { brush, setBrushForActiveLayer, onSelectColor } = useBrush(
    activeEditableLayerId,
    bringToFront,
  );

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
    if (canDeleteLayer && selectedLayerId) removeLayer(selectedLayerId);
  }, [canDeleteLayer, removeLayer, selectedLayerId]);
  const captureCanvasSnapshot = useCallback(async (quality: number) => {
    if (!viewShotRef.current) {
      return null;
    }

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
  }, []);

  const handleNext = useCallback(async () => {
    if (viewMode === "single") {
      setViewMode("composite");
      await new Promise((resolve) => setTimeout(resolve, 100));
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
    } catch (e) {
      console.error("Failed to capture snapshot for next step:", e);
    }
  }, [captureCanvasSnapshot, router, viewMode]);

  // Bottom Bar Actions
  const handleGallery = useCallback(async () => {
    setSelectedTool("gallery");

    const uris = await pickImageUris({ allowMultiple: true });
    if (!uris.length) {
      return;
    }

    addImageLayersFromUris(uris);
  }, [addImageLayersFromUris]);

  const handlePalette = useCallback(() => {
    setSelectedTool("palette");
    setPickerMode("color");
    setPatternModalVisible(false);
    setSignatureModalVisible(false);
    setColorPickerVisible(true);
  }, []);

  const handlePattern = useCallback(() => {
    setSelectedTool("pattern");
    setColorPickerVisible(false);
    setSignatureModalVisible(false);
    setPatternModalVisible(true);
  }, []);

  const handleStroke = useCallback(() => {
    setSelectedTool("stroke");
    setColorPickerVisible(false);
    setPatternModalVisible(false);
    setSignatureModalVisible(true);
  }, []);

  const handlePreview = useCallback(async () => {
    setSelectedTool("preview");
    try {
      const uri = await captureCanvasSnapshot(0.9);
      if (uri) {
        const newSnap: Snapshot = {
          id: Date.now().toString(),
          uri: uri,
          timestamp: Date.now(),
        };

        setSnapshotUri(uri);
        addSnapshot(newSnap);
        setShowSnapshotAnim(true);
      }
    } catch (e) {
      console.error("Snapshot failed:", e);
    }
  }, [addSnapshot, captureCanvasSnapshot]);

  const handlePreviewLongPress = useCallback(() => {
    setShowPreviewModal(true);
  }, []);

  const handleSelectLayer = useCallback(
    (id: string) => {
      setCompositePreviewLayers(compositeVisibleLayers);
      selectLayer(id);
      setViewMode("single");
    },
    [compositeVisibleLayers, selectLayer],
  );

  const displayedLayers =
    viewMode === "composite"
      ? compositeVisibleLayers
      : allLayersSorted.filter((layer) => layer.id === selectedLayerId);

  const stripLayers = useMemo(
    () => [...layers].filter((layer) => layer.id !== "main-image"),
    [layers],
  );

  const bottomBarLayers = useMemo(
    () => (viewMode === "single" ? compositePreviewLayers : EMPTY_LAYERS),
    [compositePreviewLayers, viewMode],
  );

  const handleZoomReset = useCallback(
    () => setZoomResetKey((prev) => prev + 1),
    [],
  );

  const handleCompositeRestore = useCallback(() => {
    setViewMode("composite");
    selectLayer(null);
  }, []);

  const handleCloseColorPicker = useCallback(
    () => setColorPickerVisible(false),
    [],
  );

  const handleClosePatternModal = useCallback(
    () => setPatternModalVisible(false),
    [],
  );

  const handleCloseSignatureModal = useCallback(
    () => setSignatureModalVisible(false),
    [],
  );

  const handleApplyPattern = useCallback(
    (preset: PatternPreset) => {
      setSelectedPatternId(preset.id);
      const patternUri =
        preset.imageUri ??
        (preset.textureSource
          ? RNImage.resolveAssetSource(preset.textureSource).uri
          : undefined);

      setBrushForActiveLayer({
        kind: "pattern",
        color: preset.tintColor,
        patternUri,
      });
      setPatternModalVisible(false);
    },
    [setBrushForActiveLayer],
  );
  const handleApplySignature = useCallback((selection: SignatureSelection) => {
    setSelectedSignatureId(selection.id);
    setSignatureSelection(selection);
    setSignatureModalVisible(false);
  }, []);
  const handleSnapshotAnimDone = useCallback(
    () => setShowSnapshotAnim(false),
    [],
  );
  const handleClosePreviewModal = useCallback(
    () => setShowPreviewModal(false),
    [],
  );
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
        {/* Header Title */}
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
          hasSelection={viewMode === "single" && !!selectedLayerId}
          canReorder={!!activeOrderLayerId}
          canDelete={canDeleteLayer}
          isZoomActive={isZoomMode}
          hideNext={viewMode === "single"}
        />

        <View style={{ flex: 1 }} ref={viewShotRef} collapsable={false}>
          <CanvasViewer
            layers={displayedLayers}
            activeLayerId={
              viewMode === "single" ? selectedLayerId : "main-image"
            }
            isZoomMode={isZoomMode}
            currentColor={brush.color}
            zoomResetKey={zoomResetKey}
            currentBrushKind={brush.kind}
            currentPatternUri={brush.patternUri}
          />
        </View>

        <LayerStrip
          layers={stripLayers}
          selectedLayerId={selectedLayerId}
          onSelectLayer={handleSelectLayer}
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
        />

        <ColorPickerModal
          visible={colorPickerVisible}
          onClose={handleCloseColorPicker}
          onSelectColor={onSelectColor}
          initialColor={brush.color}
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
  },
});
