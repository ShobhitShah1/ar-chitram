import { PATTERN_PRESETS } from "@/components/virtual-creativity/editor-presets";
import type { PatternPreset } from "@/components/virtual-creativity/editor-presets";
import { SheetHeader } from "@/components/virtual-creativity/sheet-header";
import { ControlledBottomSheet } from "@/components/controlled-bottom-sheet";
import { useTheme } from "@/context/theme-context";
import { Image } from "expo-image";
import React from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
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
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
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

  const sheetHeight = Math.min(screenHeight - 12, 320 + insets.bottom);

  return (
    <ControlledBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={[sheetHeight]}
      showHandle={false}
      backgroundStyle={styles.sheetBackground}
      contentContainerStyle={styles.sheetContent}
    >
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
    </ControlledBottomSheet>
  );
};

export const PatternModal = React.memo(PatternModalComponent);

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "transparent",
    borderWidth: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetContent: {
    flex: 0,
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
