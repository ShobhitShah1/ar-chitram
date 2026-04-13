import React from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Modal,
  Text,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, {
  Defs,
  Filter,
  FeColorMatrix,
  FeGaussianBlur,
  FeBlend,
  Image as SvgImage,
} from "react-native-svg";
import { captureRef } from "react-native-view-shot";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface SketchPreviewModalProps {
  visible: boolean;
  sketchedUri: string | null;
  onClose: () => void;
  onApply: () => void;
}

export const SketchPreviewModal: React.FC<SketchPreviewModalProps> = ({
  visible,
  sketchedUri,
  onClose,
  onApply,
}) => {
  const { theme, isDark } = useTheme();
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!sketchedUri) {
      setIsLoading(true);
    }
  }, [sketchedUri]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <BlurView
          intensity={20}
          style={StyleSheet.absoluteFill}
          tint={isDark ? "dark" : "light"}
        />

        <View style={[styles.content, { backgroundColor: theme.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              Sketch Preview
            </Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.previewContainer}>
            <Image
              source={{ uri: sketchedUri || undefined }}
              style={styles.previewImage}
              contentFit="contain"
              transition={400}
              onLoadStart={() => setIsLoading(true)}
              onLoad={() => setIsLoading(false)}
              onError={(e) => {
                console.error("Sketch preview image load error", e);
                setIsLoading(false);
              }}
            />

            {isLoading && (
              <View
                style={[
                  styles.loaderOverlay,
                  {
                    backgroundColor: isDark
                      ? "rgba(0,0,0,0.6)"
                      : "rgba(255,255,255,0.7)",
                  },
                ]}
              >
                <ActivityIndicator size="large" color={theme.textPrimary} />
                <Text style={[styles.loaderText, { color: theme.textPrimary }]}>
                  Loading generated sketch...
                </Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              Server has generated this high-contrast outline for you.
            </Text>

            <Pressable
              onPress={() =>
                onApply()
              } /* Proceed using handleConfirmSketch state logic */
              style={styles.applyBtnPressable}
            >
              <LinearGradient
                colors={theme.drawingButton as any}
                style={styles.applyBtn}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.applyBtnText}>Use Sketch</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 20,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
  },
  closeBtn: {
    padding: 4,
  },
  previewContainer: {
    width: "100%",
    height: SCREEN_HEIGHT * 0.4,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#fff", // White background for the sketch results
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.2)",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loaderText: {
    marginTop: 12,
    fontFamily: FontFamily.semibold,
    fontSize: 14,
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
  },
  hint: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  applyBtnPressable: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  applyBtn: {
    height: 56,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  applyBtnText: {
    color: "#fff",
    fontFamily: FontFamily.bold,
    fontSize: 16,
  },
});
