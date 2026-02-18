import {
  PATTERN_PRESETS,
} from "@/components/virtual-creativity/editor-presets";
import type { PatternPreset } from "@/components/virtual-creativity/editor-presets";
import { SheetHeader } from "@/components/virtual-creativity/sheet-header";
import { useTheme } from "@/context/theme-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface PatternModalProps {
  visible: boolean;
  selectedPatternId?: string | null;
  onClose: () => void;
  onApply: (preset: PatternPreset) => void;
}

const PatternModalComponent: React.FC<PatternModalProps> = ({
  visible,
  selectedPatternId,
  onClose,
  onApply,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [pendingId, setPendingId] = React.useState<string | null>(
    selectedPatternId ?? PATTERN_PRESETS[0].id,
  );

  React.useEffect(() => {
    if (visible) {
      setPendingId(selectedPatternId ?? PATTERN_PRESETS[0].id);
    }
  }, [selectedPatternId, visible]);

  const handleApply = React.useCallback(() => {
    const chosen =
      PATTERN_PRESETS.find((preset) => preset.id === pendingId) ??
      PATTERN_PRESETS[0];
    onApply(chosen);
  }, [onApply, pendingId]);

  const renderPatternItem = React.useCallback(
    ({ item }: { item: PatternPreset }) => {
      const selected = pendingId === item.id;
      return (
        <Pressable
          onPress={() => setPendingId(item.id)}
          style={[styles.tileWrap, selected && styles.tileWrapSelected]}
        >
          <LinearGradient
            colors={item.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tile}
          >
            {item.textureSource ? (
              <Image
                source={item.textureSource}
                style={styles.texture}
                contentFit="cover"
              />
            ) : null}
          </LinearGradient>
        </Pressable>
      );
    },
    [pendingId],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.modalBackground,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <SheetHeader title="Pattern" onClose={onClose} onConfirm={handleApply} />

          <FlatList
            data={PATTERN_PRESETS}
            keyExtractor={(item) => item.id}
            numColumns={6}
            renderItem={renderPatternItem}
            columnWrapperStyle={styles.column}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            initialNumToRender={12}
            maxToRenderPerBatch={18}
            windowSize={3}
          />
        </View>
      </View>
    </Modal>
  );
};

export const PatternModal = React.memo(PatternModalComponent);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
    justifyContent: "flex-end",
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 4,
    paddingHorizontal: 20,
    maxHeight: 320,
  },
  gridContent: {
    paddingTop: 10,
    paddingBottom: 14,
  },
  column: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  tileWrap: {
    width: 50,
    height: 60,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  tileWrapSelected: {
    borderColor: "#1D1D1D",
    borderWidth: 1.5,
  },
  tile: {
    flex: 1,
  },
  texture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.28,
  },
});
