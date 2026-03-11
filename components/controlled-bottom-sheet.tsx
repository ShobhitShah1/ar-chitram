import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React from "react";
import { type StyleProp, type ViewStyle } from "react-native";

import { CommonBottomSheet } from "./common-bottom-sheet";

interface ControlledBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: ReadonlyArray<string | number>;
  enablePanDownToClose?: boolean;
  backgroundStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  enableDynamicSizing?: boolean;
  enableContentPanningGesture?: boolean;
  enableHandlePanningGesture?: boolean;
  showBackdrop?: boolean;
  backdropOpacity?: number;
  showHandle?: boolean;
  onWillPresent?: () => void;
}

export const ControlledBottomSheet: React.FC<ControlledBottomSheetProps> = ({
  visible,
  onClose,
  children,
  snapPoints,
  enablePanDownToClose,
  backgroundStyle,
  contentContainerStyle,
  enableDynamicSizing,
  enableContentPanningGesture,
  enableHandlePanningGesture,
  showBackdrop,
  backdropOpacity,
  showHandle,
  onWillPresent,
}) => {
  const modalRef = React.useRef<BottomSheetModal | null>(null);
  const wasVisibleRef = React.useRef(false);

  React.useEffect(() => {
    if (visible === wasVisibleRef.current) {
      return;
    }

    wasVisibleRef.current = visible;

    if (visible) {
      onWillPresent?.();
      requestAnimationFrame(() => {
        modalRef.current?.present();
      });
      return;
    }

    modalRef.current?.dismiss();
  }, [onWillPresent, visible]);

  const handleDismiss = React.useCallback(() => {
    wasVisibleRef.current = false;
    onClose();
  }, [onClose]);

  return (
    <CommonBottomSheet
      modalRef={modalRef}
      onDismiss={handleDismiss}
      snapPoints={snapPoints}
      enablePanDownToClose={enablePanDownToClose}
      backgroundStyle={backgroundStyle}
      contentContainerStyle={contentContainerStyle}
      enableDynamicSizing={enableDynamicSizing}
      enableContentPanningGesture={enableContentPanningGesture}
      enableHandlePanningGesture={enableHandlePanningGesture}
      showBackdrop={showBackdrop}
      backdropOpacity={backdropOpacity}
      showHandle={showHandle}
    >
      {children}
    </CommonBottomSheet>
  );
};
