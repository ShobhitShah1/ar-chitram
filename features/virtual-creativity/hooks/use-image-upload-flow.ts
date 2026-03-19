import {
  type ImageUploadFlowModalProps,
  type ImageUploadFlowResult,
} from "@/features/virtual-creativity/components/image-upload-flow-modal";
import { pickImageUri } from "@/utils/image-picker";
import React from "react";

interface UseImageUploadFlowOptions {
  onComplete: (result: ImageUploadFlowResult) => Promise<void> | void;
  title?: string;
  description?: string;
  doneLabel?: string;
}

interface UseImageUploadFlowResult {
  startUploadFlow: () => Promise<void>;
  isPickingImage: boolean;
  modalProps: ImageUploadFlowModalProps;
}

export const useImageUploadFlow = ({
  onComplete,
  title,
  description,
  doneLabel,
}: UseImageUploadFlowOptions): UseImageUploadFlowResult => {
  const [imageUri, setImageUri] = React.useState<string | null>(null);
  const [visible, setVisible] = React.useState(false);
  const [isPickingImage, setIsPickingImage] = React.useState(false);

  const closeUploadFlow = React.useCallback(() => {
    setVisible(false);
    setImageUri(null);
  }, []);

  const handleComplete = React.useCallback(
    async (result: ImageUploadFlowResult) => {
      closeUploadFlow();
      await onComplete(result);
    },
    [closeUploadFlow, onComplete],
  );

  const startUploadFlow = React.useCallback(async () => {
    if (isPickingImage) {
      return;
    }

    setIsPickingImage(true);

    try {
      const nextImageUri = await pickImageUri();
      if (!nextImageUri) {
        return;
      }

      setImageUri(nextImageUri);
      setVisible(true);
    } finally {
      setIsPickingImage(false);
    }
  }, [isPickingImage]);

  return {
    startUploadFlow,
    isPickingImage,
    modalProps: {
      visible,
      imageUri,
      onClose: closeUploadFlow,
      onComplete: handleComplete,
      title,
      description,
      doneLabel,
    },
  };
};
