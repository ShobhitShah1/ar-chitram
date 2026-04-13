import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Modal,
  Text,
  ActivityIndicator,
  Pressable,
} from "react-native";
import Svg, {
  Defs,
  Filter,
  FeColorMatrix,
  FeConvolveMatrix,
  FeGaussianBlur,
  FeComposite,
  Image as SvgImage,
} from "react-native-svg";
import { captureRef } from "react-native-view-shot";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as FileSystem from "expo-file-system/legacy";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import Ionicons from "@expo/vector-icons/Ionicons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface OutlinePreviewModalProps {
  visible: boolean;
  imageUri: string | null;
  imageWidth?: number;
  imageHeight?: number;
  onClose: () => void;
  onApply: (sketchedUri: string) => void;
}

export const OutlinePreviewModal: React.FC<OutlinePreviewModalProps> = ({
  visible,
  imageUri,
  imageWidth = 1000,
  imageHeight = 1000,
  onClose,
  onApply,
}) => {
  const { theme, isDark } = useTheme();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const previewRef = useRef<View>(null);

  // Reset ready state when visibility changes
  useEffect(() => {
    if (visible && imageUri) {
      setIsReady(false);
      setLocalUri(null);

      const prepareImage = async () => {
        setIsDownloading(true);
        try {
          if (imageUri.startsWith("http")) {
            const filename = imageUri.split("/").pop() || "tmp.jpg";
            const targetUri = `${FileSystem.cacheDirectory}${filename}`;
            const downloadRes = await FileSystem.downloadAsync(
              imageUri,
              targetUri,
            );
            setLocalUri(downloadRes.uri);
          } else {
            setLocalUri(imageUri);
          }
          // Small delay to ensure SVG filters can initialize
          setTimeout(() => setIsReady(true), 100);
        } catch (error) {
          console.error("Sketch image preparation failed", error);
        } finally {
          setIsDownloading(false);
        }
      };

      prepareImage();
    }
  }, [visible, imageUri]);

  const handleCapture = async () => {
    if (!previewRef.current) return;
    try {
      setIsCapturing(true);
      const uri = await captureRef(previewRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      onApply(uri);
    } catch (error) {
      console.error("Outline capture failed", error);
    } finally {
      setIsCapturing(false);
    }
  };

  if (!imageUri) return null;

  // Calculate preview dimensions (fitting within modal)
  const maxViewW = SCREEN_WIDTH * 0.9;
  const maxViewH = SCREEN_HEIGHT * 0.55;
  const ratio = Math.min(maxViewW / imageWidth, maxViewH / imageHeight);
  const displayW = imageWidth * ratio;
  const displayH = imageHeight * ratio;

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
            {(isDownloading || !isReady) && (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={theme.textPrimary} />
                <Text
                  style={[styles.loaderText, { color: theme.textSecondary }]}
                >
                  {isDownloading
                    ? "Downloading Image..."
                    : "Preparing Sketch..."}
                </Text>
              </View>
            )}

            {isReady && localUri && (
              <View
                ref={previewRef}
                collapsable={false}
                style={{
                  width: displayW,
                  height: displayH,
                  backgroundColor: "#fff",
                }}
              >
                <Svg
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${imageWidth} ${imageHeight}`}
                >
                  <Defs>
                    <Filter id="sketchFilter">
                      {/* 1. Grayscale */}
                      <FeColorMatrix
                        type="matrix"
                        values="0.33 0.33 0.33 0 0 
                                   0.33 0.33 0.33 0 0 
                                   0.33 0.33 0.33 0 0 
                                   0 0 0 1 0"
                        result="gray"
                      />

                      {/* 2. Difference of Gaussians for Edge Detection (Widely Supported) */}
                      <FeGaussianBlur
                        in="gray"
                        stdDeviation="0.8"
                        result="sharp"
                      />
                      <FeGaussianBlur
                        in="gray"
                        stdDeviation="3.0"
                        result="soft"
                      />

                      <FeComposite
                        in="sharp"
                        in2="soft"
                        operator="arithmetic"
                        k2="4"
                        k3="-4"
                        k4="0.4"
                        result="edge"
                      />

                      {/* 3. Aggressive contrast/threshold for coloring-book lines */}
                      <FeColorMatrix
                        type="matrix"
                        values="-1 -1 -1 0 1 
                                  -1 -1 -1 0 1 
                                  -1 -1 -1 0 1 
                                  0  0  0 25 -2"
                      />
                    </Filter>
                  </Defs>
                  <SvgImage
                    href={{ uri: localUri }}
                    width={imageWidth}
                    height={imageHeight}
                    filter="url(#sketchFilter)"
                  />
                </Svg>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              Generating a professional coloring-book outline for your canvas.
            </Text>

            <Pressable
              onPress={handleCapture}
              disabled={isCapturing || !isReady}
              style={styles.applyBtnPressable}
            >
              <LinearGradient
                colors={theme.drawingButton as any}
                style={styles.applyBtn}
              >
                {isCapturing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.applyBtnText}>Use Sketch</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {isCapturing && (
            <View style={styles.loadingOverlay}>
              <BlurView
                intensity={20}
                style={StyleSheet.absoluteFill}
                tint={isDark ? "dark" : "light"}
              />
              <ActivityIndicator size="large" color={theme.textPrimary} />
              <Text style={[styles.loadingText, { color: theme.textPrimary }]}>
                Processing Sketch...
              </Text>
            </View>
          )}
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
    height: SCREEN_HEIGHT * 0.45,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#fff",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.2)",
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 28,
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  loaderContainer: {
    alignItems: "center",
    gap: 12,
  },
  loaderText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
  },
});
