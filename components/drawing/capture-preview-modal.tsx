import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/theme-context";
import { FontFamily } from "@/constants/fonts";

import {
  COLUMNS,
  getPosition,
  MARGIN,
  OffsetData,
  SortableItem,
  SPACING,
  TILE_ASPECT,
  TILE_SIZE,
} from "./sortable-item";

export interface Snapshot {
  id: string;
  uri: string;
  timestamp?: number;
}

interface CapturePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  snapshots: Snapshot[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDelete: (id: string) => void;
  onUpdateSnapshots: (newSnapshots: Snapshot[]) => void;
}

export const CapturePreviewModal: React.FC<CapturePreviewModalProps> = ({
  visible,
  onClose,
  snapshots,
  onDelete,
  onUpdateSnapshots,
}) => {
  const { theme } = useTheme();

  // Shared Values for Drag and Drop
  const offsets = useSharedValue<OffsetData>({});
  const activeId = useSharedValue<string | null>(null);
  const containerHeight = useSharedValue(0);

  // Initialize offsets when visible
  useEffect(() => {
    if (visible && snapshots.length > 0) {
      const newOffsets: any = {};
      snapshots.forEach((snap, index) => {
        // Only re-calc if not already dragging or if length changed drastically?
        // Actually, always syncing to props is good for initial load.
        const pos = getPosition(index);
        newOffsets[snap.id] = { order: index, x: pos.x, y: pos.y };
      });
      offsets.value = newOffsets;

      const rows = Math.ceil(snapshots.length / COLUMNS);
      containerHeight.value = rows * (TILE_SIZE * TILE_ASPECT + SPACING);
    }
  }, [snapshots, visible]);

  const handleDragEnd = () => {
    // Sort snapshots based on current offset order
    const sorted = [...snapshots].sort((a, b) => {
      const orderA = offsets.value[a.id]?.order ?? 0;
      const orderB = offsets.value[b.id]?.order ?? 0;
      return orderA - orderB;
    });
    onUpdateSnapshots(sorted);
  };

  const containerStyle = useAnimatedStyle(() => ({
    height: containerHeight.value + 100, // Extra padding
    width: "100%",
  }));

  /* 
    VIDEO GENERATION LOGIC - COMMENTED OUT FOR LATER USE
    
    // const [generating, setGenerating] = useState(false);
    // const [videoPath, setVideoPath] = useState<string | null>(null);
    // ... filtering states, socket logic, etc.
  */

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.root, { backgroundColor: theme.background }]}
        edges={["top"]}
      >
        <GestureHandlerRootView style={styles.container}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.background }]}>
            <Pressable onPress={onClose} style={[styles.iconBtn]}>
              <Ionicons name="close" size={24} color={theme.textPrimary} />
            </Pressable>

            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                Capture
              </Text>
              <Text
                style={[styles.headerSubtitle, { color: theme.textSecondary }]}
              >
                {snapshots.length} frames
              </Text>
            </View>

            <View style={styles.headerActions}>
              {/* Save / Export buttons placeholder */}
              {/* 
                  <TouchableOpacity style={styles.primaryBtn} onPress={handleGenerate}>
                    <Ionicons name="videocam" size={20} color="#fff" />
                  </TouchableOpacity>
                */}
            </View>
          </View>

          {/* Grid Content */}
          <View style={styles.content}>
            <Animated.ScrollView
              contentContainerStyle={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ margin: MARGIN, flex: 1 }}>
                <Animated.View style={containerStyle}>
                  {snapshots.map((snap) => (
                    <SortableItem
                      key={snap.id}
                      id={snap.id}
                      uri={snap.uri}
                      itemCount={snapshots.length}
                      offsets={offsets}
                      activeId={activeId}
                      onDragEnd={handleDragEnd}
                      onDelete={onDelete}
                    />
                  ))}
                </Animated.View>
              </View>
            </Animated.ScrollView>
          </View>

          {/* 
            BOTTOM ANIMATIONS / STUDIO PANEL - COMMENTED OUT
            
            // <Animated.View style={styles.studioPanel}>
            //    ... Tabs, Options, Sliders ...
            // </Animated.View> 
          */}
        </GestureHandlerRootView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitleContainer: {
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    marginTop: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerActions: {
    width: 40, // Balance the left button
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
});
