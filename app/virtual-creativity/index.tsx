import { ColorPickerModal } from "@/components/color-picker-modal";
import { LayerStrip } from "@/components/virtual-creativity/layer-strip";
import {
  BottomBar,
  ToolType,
} from "@/components/virtual-creativity/bottom-bar";
import { TopBar } from "@/components/virtual-creativity/top-bar";
import { useTheme } from "@/context/theme-context";
import { useVirtualCreativityStore } from "@/store/virtual-creativity-store";
import { useRouter } from "expo-router";
import React, { useState, useRef } from "react";
import { StyleSheet, Text, View, Dimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontFamily } from "@/constants/fonts";
import { CanvasViewer } from "@/components/virtual-creativity/canvas-viewer";
import { captureRef } from "react-native-view-shot";
import ScreenshotCaptureAnimation from "@/components/drawing/screenshot-capture-animation";
import {
  CapturePreviewModal,
  Snapshot,
} from "@/components/drawing/capture-preview-modal";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function VirtualCreativityScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();

  // Store state
  const {
    layers,
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
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

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

  const handleNext = () => {
    console.log("Next clicked");
  };

  // Bottom Bar Actions
  const handleGallery = () => {
    setSelectedTool("gallery");
    console.log("Gallery clicked");

    const testLayer = {
      id: Date.now().toString(),
      type: "image" as const,
      uri: "https://picsum.photos/1080/1920",
      x: 0,
      y: 0,
      width: 1080,
      height: 1920,
      rotation: 0,
      scale: 1,
      opacity: 1,
      zIndex: layers.length + 1,
    };
    addLayer(testLayer);
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
        setSnapshots((prev) => [...prev, newSnap]);
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
  };

  // Display only the select layer
  const displayedLayer = layers.find((l) => l.id === selectedLayerId);

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
        />

        {/* Canvas Viewer Container for Snapshot */}
        <View style={{ flex: 1 }} ref={viewShotRef} collapsable={false}>
          <CanvasViewer
            layer={displayedLayer}
            isZoomMode={isZoomMode}
            currentColor={selectedColor}
          />
        </View>

        {/* Layer Thumbnails Strip */}
        <LayerStrip
          layers={layers}
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
          selectedTool={selectedTool}
          previewBadge={snapshots.length}
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
          onDelete={(id) =>
            setSnapshots((prev) => prev.filter((s) => s.id !== id))
          }
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
