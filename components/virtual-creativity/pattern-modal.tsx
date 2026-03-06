import { PATTERN_PRESETS } from "@/components/virtual-creativity/editor-presets";
import type { PatternPreset } from "@/components/virtual-creativity/editor-presets";
import { SheetHeader } from "@/components/virtual-creativity/sheet-header";
import { useTheme } from "@/context/theme-context";
import { Image } from "expo-image";
import React from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import Modal from "react-native-modal";
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
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [pendingId, setPendingId] = React.useState<string | null>(
    selectedPatternId ?? null,
  );

  React.useEffect(() => {
    if (visible) {
      setPendingId(selectedPatternId ?? null);
    }
  }, [selectedPatternId, visible]);

  const handleApply = React.useCallback(() => {
    if (!pendingId) {
      onClose();
      return;
    }
    const chosen = PATTERN_PRESETS.find((preset) => preset.id === pendingId);
    if (!chosen) {
      onClose();
      return;
    }
    onApply(chosen);
  }, [onApply, onClose, pendingId]);

  const renderPatternItem = React.useCallback(
    ({ item }: { item: PatternPreset }) => {
      const selected = pendingId === item.id;
      return (
        <Pressable
          onPress={() => setPendingId(item.id)}
          style={[
            styles.tileWrap,
            selected && [styles.tileWrapSelected, { borderColor: "#1D1D1D" }],
          ]}
        >
          <Image source={item.source} style={styles.tile} contentFit="cover" />
        </Pressable>
      );
    },
    [pendingId],
  );

  return (
    <Modal
      isVisible={visible}
      style={styles.modal}
      hasBackdrop={true}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={260}
      animationOutTiming={220}
      backdropTransitionInTiming={220}
      backdropTransitionOutTiming={220}
      onBackButtonPress={onClose}
      onBackdropPress={onClose}
      backdropOpacity={0.5}
      useNativeDriver
      useNativeDriverForBackdrop
      propagateSwipe
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? "#F5F5F5" : "#FFFFFF",
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <SheetHeader
            title="Pattern"
            onClose={onClose}
            onConfirm={handleApply}
          />

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
  modal: {
    margin: 0,
    justifyContent: "flex-end",
  },
  overlay: {
    flex: 1,
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
    borderWidth: 0,
  },
  tileWrapSelected: {
    borderWidth: 1.5,
  },
  tile: {
    flex: 1,
  },
});
