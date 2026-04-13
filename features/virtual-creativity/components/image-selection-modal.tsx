import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Text,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { Pressable as ThemedPressable } from "@/components/themed";

interface ImageSelectionModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onApply: (asSketch: boolean) => void;
}

export const ImageSelectionModal: React.FC<ImageSelectionModalProps> = ({
  visible,
  imageUri,
  onClose,
  onApply,
}) => {
  const { theme, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(true);

  return (
    <Modal
      visible={visible && !!imageUri}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <BlurView
          intensity={40}
          style={StyleSheet.absoluteFill}
          tint={isDark ? "dark" : "light"}
        />
        <View
          style={[styles.modalContent, { backgroundColor: theme.background }]}
        >
          <View style={styles.modalImageContainer}>
            <Image
              source={{ uri: imageUri || "" }}
              style={styles.modalPreviewImage}
              contentFit="contain"
              onLoadStart={() => setIsLoading(true)}
              onError={() => setIsLoading(false)}
              onLoad={() => setIsLoading(false)}
            />
            {isLoading && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: -1,
                  },
                ]}
              >
                <ActivityIndicator size="small" color={theme.textPrimary} />
              </View>
            )}
          </View>

          <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
            Choose Style
          </Text>
          <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
            How would you like to add this image to your canvas?
          </Text>

          <View style={styles.modalButtonsRow}>
            <ThemedPressable
              onPress={() => onApply(false)}
              style={[
                styles.modalActionBtn,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.05)",
                },
              ]}
            >
              <Ionicons name="image" size={18} color={theme.textPrimary} />
              <Text
                style={[
                  styles.modalActionBtnText,
                  { color: theme.textPrimary },
                ]}
              >
                Original
              </Text>
            </ThemedPressable>

            <ThemedPressable
              onPress={() => onApply(true)}
              style={styles.modalActionBtnPrimary}
            >
              <LinearGradient
                colors={theme.drawingButton as any}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="color-filter" size={18} color="#fff" />
              <Text style={styles.modalActionBtnTextPrimary}>Sketch</Text>
            </ThemedPressable>
          </View>

          <Pressable onPress={onClose} style={styles.modalCancelFull}>
            <Text
              style={[styles.modalCancelText, { color: theme.textSecondary }]}
            >
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    alignItems: "center",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
  },
  modalImageContainer: {
    width: "100%",
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: "rgba(128,128,128,0.05)",
  },
  modalPreviewImage: {
    width: "100%",
    height: "100%",
  },
  modalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    marginBottom: 6,
  },
  modalDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  modalButtonsRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: 18,
    gap: 8,
  },
  modalActionBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: 18,
    gap: 8,
    overflow: "hidden",
  },
  modalActionBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
  },
  modalActionBtnTextPrimary: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: "#fff",
  },
  modalCancelFull: {
    marginTop: 5,
    width: "100%",
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCancelText: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
  },
});
