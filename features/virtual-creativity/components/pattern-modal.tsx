import { PATTERN_PRESETS } from "@/features/virtual-creativity/constants/editor-presets";
import type { PatternPreset } from "@/features/virtual-creativity/constants/editor-presets";
import { SheetHeader } from "@/features/virtual-creativity/components/sheet-header";
import { useTheme } from "@/context/theme-context";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";

interface PatternModalProps {
  visible: boolean;
  selectedPatternId?: string | null;
  bottomInset?: number;
  onClose: () => void;
  onApply: (preset: PatternPreset) => void;
}

const PatternModalComponent: React.FC<PatternModalProps> = ({
  visible,
  selectedPatternId,
  bottomInset = 0,
  onClose,
  onApply,
}) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomSheetModalRef = React.useRef<BottomSheetModal>(null);

  const [pendingId, setPendingId] = React.useState<string | null>(
    selectedPatternId ?? null,
  );

  React.useEffect(() => {
    if (visible) {
      setPendingId(selectedPatternId ?? null);
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
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

  const renderBackdrop = React.useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
      />
    ),
    [],
  );

  const sheetBottomPadding = Math.max(insets.bottom - bottomInset, 0);

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={["70%"]}
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      enableDynamicSizing={false}
      handleComponent={null}
      backgroundStyle={styles.sheetBackground}
    >
      <View style={styles.sheetContent}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? "#F5F5F5" : "#FFFFFF",
            },
          ]}
        >
          <SheetHeader
            title="Pattern"
            onClose={onClose}
            onConfirm={handleApply}
          />

          <BottomSheetFlatList
            data={PATTERN_PRESETS}
            keyExtractor={(item: any) => item.id}
            numColumns={6}
            renderItem={renderPatternItem}
            columnWrapperStyle={styles.column}
            contentContainerStyle={[
              styles.gridContent,
              { paddingBottom: sheetBottomPadding + 40 },
            ]}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </BottomSheetModal>
  );
};

export const PatternModal = React.memo(PatternModalComponent);

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  sheetContent: {
    flex: 1,
  },
  card: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  gridContent: {
    paddingTop: 10,
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
