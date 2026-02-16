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
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image as RNImage,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { CanvasLayer } from "@/components/virtual-creativity/canvas-layer";
import { FontFamily } from "@/constants/fonts";
import { Image } from "expo-image";

export default function VirtualCreativityScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();

  // Store state
  const {
    layers,
    history,
    undo,
    redo,
    reset,
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

  const handleResize = () => {
    console.log("Resize clicked");
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
    // Pseudo implementation
    const testLayer = {
      id: Date.now().toString(),
      type: "image" as const,
      uri: "https://picsum.photos/200/300",
      x: 100,
      y: 100,
      width: 150,
      height: 200,
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

  const handlePreview = () => {
    setSelectedTool("preview");
    console.log("Preview clicked");
  };

  const onSelectColor = (color: string) => {
    if (selectedLayerId) {
      updateLayer(selectedLayerId, { color });
    }
  };

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
          onResize={handleResize}
          onDelete={handleDelete}
          onNext={handleNext}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          hasSelection={!!selectedLayerId}
        />
        <View style={styles.canvasContainer}>
          {/* Render Layers */}
          {layers.map((layer) => (
            <CanvasLayer
              key={layer.id}
              layer={layer}
              isSelected={layer.id === selectedLayerId}
              onSelect={() => selectLayer(layer.id)}
            />
          ))}
        </View>
        {/* Layer Thumbnails Strip */}
        <LayerStrip
          layers={layers}
          selectedLayerId={selectedLayerId}
          onSelectLayer={selectLayer}
        />
        <BottomBar
          onGallery={handleGallery}
          onPalette={handlePalette}
          onPattern={handlePattern}
          onStroke={handleStroke}
          onPreview={handlePreview}
          selectedTool={selectedTool}
        />
        <ColorPickerModal
          visible={colorPickerVisible}
          onClose={() => setColorPickerVisible(false)}
          onSelectColor={onSelectColor}
          mode={pickerMode}
          onSelectGradient={(colors) => console.log("Gradient:", colors)}
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
  canvasContainer: {
    flex: 1,
    backgroundColor: "#e0e0e0", // Placeholder bg
    overflow: "hidden",
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
  },
});
