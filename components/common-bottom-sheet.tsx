import { useTheme } from "@/context/theme-context";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
  type BottomSheetHandleProps,
  useBottomSheetSpringConfigs,
} from "@gorhom/bottom-sheet";
import React, { memo, useCallback, useMemo } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

export const COMMON_SHEET_BACKDROP_COLOR = "#000000";
export const COMMON_SHEET_BACKDROP_OPACITY = 0.5;

interface CommonBottomSheetProps {
  modalRef: React.RefObject<BottomSheetModal | null>;
  children: React.ReactNode;
  onDismiss?: () => void;
  snapPoints?: ReadonlyArray<string | number>;
  bottomInset?: number;
  enablePanDownToClose?: boolean;
  backgroundStyle?: StyleProp<ViewStyle>;
  handleIndicatorStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  enableDynamicSizing?: boolean;
  enableContentPanningGesture?: boolean;
  enableHandlePanningGesture?: boolean;
  showBackdrop?: boolean;
  backdropOpacity?: number;
  backdropColor?: string;
  showHandle?: boolean;
}

export const CommonBottomSheet: React.FC<CommonBottomSheetProps> = memo(
  ({
    modalRef,
    children,
    onDismiss,
    snapPoints,
    bottomInset = 0,
    enablePanDownToClose = false,
    backgroundStyle,
    handleIndicatorStyle,
    contentContainerStyle,
    enableDynamicSizing = false,
    enableContentPanningGesture = false,
    enableHandlePanningGesture = false,
    showBackdrop = true,
    backdropOpacity = COMMON_SHEET_BACKDROP_OPACITY,
    backdropColor = COMMON_SHEET_BACKDROP_COLOR,
    showHandle = true,
  }) => {
    const { theme } = useTheme();

    const resolvedSnapPoints = useMemo<Array<string | number>>(
      () => (snapPoints ? [...snapPoints] : ["84%"]),
      [snapPoints],
    );

    const animationConfigs = useBottomSheetSpringConfigs({
      damping: 42,
      stiffness: 330,
      mass: 0.5,
      overshootClamping: false,
    });

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={backdropOpacity}
          pressBehavior="close"
          style={[props.style, { backgroundColor: backdropColor }]}
        />
      ),
      [backdropColor, backdropOpacity],
    );

    const renderHiddenHandle = useCallback(
      (_props: BottomSheetHandleProps) => null,
      [],
    );

    return (
      <BottomSheetModal
        ref={modalRef}
        index={0}
        snapPoints={resolvedSnapPoints}
        bottomInset={bottomInset}
        enableDynamicSizing={enableDynamicSizing}
        animationConfigs={animationConfigs}
        onDismiss={onDismiss}
        backdropComponent={showBackdrop ? renderBackdrop : undefined}
        enablePanDownToClose={enablePanDownToClose}
        enableContentPanningGesture={enableContentPanningGesture}
        enableHandlePanningGesture={enableHandlePanningGesture}
        enableOverDrag={false}
        handleComponent={showHandle ? undefined : renderHiddenHandle}
        handleIndicatorStyle={
          showHandle
            ? [
                styles.handleIndicator,
                { backgroundColor: theme.textSecondary },
                handleIndicatorStyle,
              ]
            : styles.hiddenHandleIndicator
        }
        backgroundStyle={[
          styles.sheetBackground,
          {
            backgroundColor: theme.modalBackground,
            borderColor: theme.borderPrimary,
          },
          backgroundStyle,
        ]}
      >
        <BottomSheetView style={[styles.content, contentContainerStyle]}>
          {children}
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
  },
  handleIndicator: {
    width: 44,
    height: 4,
  },
  hiddenHandleIndicator: {
    width: 0,
    height: 0,
    opacity: 0,
  },
  content: {
    flex: 1,
  },
});
