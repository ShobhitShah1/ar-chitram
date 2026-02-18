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
import { LayerStrip } from "@/components/virtual-creativity/layer-strip";
import { TopBar } from "@/components/virtual-creativity/top-bar";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { useVirtualCreativityStore } from "@/store/virtual-creativity-store";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function VirtualCreativityScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();

  // Store state
  const {
    layers,
    snapshots,
    addSnapshot,
    setSnapshots,
    removeSnapshot,
    history,
    undo,
    redo,
    removeLayer,
    updateLayer,
    addLayer,
    bringToFront,
    sendToBack,
    selectedLayerId,
    selectLayer,
  } = useVirtualCreativityStore();

  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<"color" | "gradient">("color");
  const [selectedTool, setSelectedTool] = useState<ToolType>("gallery");

  // Canvas & Zoom State
  const [isZoomMode, setIsZoomMode] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#000000");

  // Snapshot State
  const viewShotRef = useRef<View>(null);
  const [snapshotUri, setSnapshotUri] = useState<string | null>(null);
  const [showSnapshotAnim, setShowSnapshotAnim] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // View Mode: 'composite' (all layers with z-index) or 'single' (focused layer)
  const [viewMode, setViewMode] = useState<"composite" | "single">("composite");

  // Load default layer on mount
  React.useEffect(() => {
    if (layers.length === 0) {
      const initialLayer = {
        id: "main-image",
        type: "image" as const,
        uri: "https://picsum.photos/1080/1920",
        x: 0,
        y: 0,
        width: 1080,
        height: 1920,
        rotation: 0,
        scale: 1,
        opacity: 1,
        zIndex: 1,
      };
      addLayer(initialLayer);
      // Ensure the main image is NOT selected by default so it doesn't show in the strip as selected
      setTimeout(() => selectLayer(null), 100);
    }
  }, []);

  const handleBack = () => router.back();

  const handleUndo = () => undo();
  const handleRedo = () => redo();

  const handleBringToFront = () => {
    if (selectedLayerId) {
      bringToFront(selectedLayerId);
    }
  };

  const handleSendToBack = () => {
    if (selectedLayerId) {
      sendToBack(selectedLayerId);
    }
  };

  const handleZoomToggle = () => {
    setIsZoomMode(!isZoomMode);
  };

  const handleDelete = () => {
    if (selectedLayerId) removeLayer(selectedLayerId);
  };

  const handleNext = async () => {
    console.log("Next clicked - Capturing snapshot");

    // Ensure we are in composite mode to capture full view
    if (viewMode === "single") {
      setViewMode("composite");
      // Wait for render to update
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    try {
      if (viewShotRef.current) {
        const uri = await captureRef(viewShotRef, {
          format: "png",
          quality: 1, // High quality for drawing base
        });

        console.log("Snapshot captured:", uri);

        // Navigate to Preview Screen with captured image
        router.push({
          pathname: "/virtual-creativity/preview",
          params: { imageUri: uri },
        });
      }
    } catch (e) {
      console.error("Failed to capture snapshot for next step:", e);
    }
  };

  // Bottom Bar Actions
  const handleGallery = () => {
    setSelectedTool("gallery");
    console.log("Gallery clicked - Adding Reference Image");

    // Simulate selecting from "Animal 1 to 7"
    const animalId = `animal-${Date.now()}`;
    const newLayer = {
      id: animalId,
      type: "image" as const,
      // Use different picsum images to simulate different animals, same size as main
      uri: `https://picsum.photos/seed/${animalId}/1080/1920`,
      x: 0,
      y: 0,
      width: 1080,
      height: 1920,
      rotation: 0,
      scale: 1,
      opacity: 1,
      zIndex: layers.length + 1,
    };
    addLayer(newLayer);

    // User requested "main image remains in full view" - so we stay in composite mode usually?
    // But earlier they said "after click on category show that preview view" (single mode).
    // Let's assume adding a layer *selects* it, thus entering Single Mode to edit it.
    selectLayer(animalId);
    setViewMode("single");
  };

  const handlePalette = () => {
    setSelectedTool("palette");
    setPickerMode("color");
    setColorPickerVisible(true);
  };

  const handlePattern = () => {
    setSelectedTool("pattern");
    console.log("Pattern clicked");
  };

  const handleStroke = () => {
    setSelectedTool("stroke");
    console.log("Stroke clicked");
  };

  const handlePreview = async () => {
    setSelectedTool("preview");
    try {
      if (viewShotRef.current) {
        const uri = await captureRef(viewShotRef, {
          format: "png",
          quality: 0.9,
        });

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
  };

  const handlePreviewLongPress = () => {
    setShowPreviewModal(true);
  };

  const onSelectColor = (color: string) => {
    setSelectedColor(color);
  };

  const handleSelectLayer = (id: string) => {
    selectLayer(id);
    setViewMode("single");
  };

  // Logic for layers to display in Main Viewer
  // If composite (default), show ONLY the main image.
  // If single (category selected), show ONLY the selected layer.
  const displayedLayers =
    viewMode === "composite"
      ? layers.filter((l) => l.id === "main-image")
      : layers.filter((l) => l.id === selectedLayerId);

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
          onDelete={handleDelete}
          onNext={handleNext}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          hasSelection={!!selectedLayerId}
          isZoomActive={isZoomMode}
          hideNext={viewMode === "single"}
        />

        {/* Canvas Viewer Container for Snapshot */}
        <View style={{ flex: 1 }} ref={viewShotRef} collapsable={false}>
          <CanvasViewer
            layers={displayedLayers}
            activeLayerId={selectedLayerId}
            isZoomMode={isZoomMode}
            currentColor={selectedColor}
          />
        </View>

        {/* Layer Thumbnails Strip - Always Visible */}
        <LayerStrip
          layers={layers.filter((l) => l.id !== "main-image")}
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
          onCompositeRestore={() => {
            setViewMode("composite");
            selectLayer(null);
          }}
          selectedTool={selectedTool}
          previewBadge={snapshots.length}
          mode={viewMode === "single" ? "single" : "default"}
          // Use only main image for composite preview thumbnail
          layers={layers.filter((l) => l.id === "main-image")}
        />

        <ColorPickerModal
          visible={colorPickerVisible}
          onClose={() => setColorPickerVisible(false)}
          onSelectColor={onSelectColor}
          mode={pickerMode}
          onSelectGradient={(colors) => console.log("Gradient:", colors)}
        />

        <ScreenshotCaptureAnimation
          visible={showSnapshotAnim}
          imageUri={snapshotUri}
          targetPosition={{ x: SCREEN_WIDTH - 60, y: SCREEN_HEIGHT - 100 }}
          onAnimationComplete={() => setShowSnapshotAnim(false)}
        />
        <CapturePreviewModal
          visible={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
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
