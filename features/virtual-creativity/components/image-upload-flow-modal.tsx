import { ic_close } from "@/assets/icons";
import { debugLog } from "@/constants/debug";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import {
  checkBackgroundRemovalNativeSupport,
  getBackgroundRemovalErrorInfo,
  logBackgroundRemovalFailure,
  prepareBackgroundRemovalFallbackSource,
  prepareBackgroundRemovalSource,
  shouldRetryBackgroundRemovalWithFallback,
} from "@/features/virtual-creativity/services/background-removal-service";
import { removeBackground } from "@six33/react-native-bg-removal";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export interface ImageUploadFlowResult {
  originalUri: string;
  finalUri: string;
  transparentUri?: string;
  backgroundRemoved: boolean;
}

export interface ImageUploadFlowModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onComplete: (result: ImageUploadFlowResult) => Promise<void> | void;
  title?: string;
  description?: string;
  doneLabel?: string;
}

type PreviewMode = "original" | "removed";
type RemovalSupportState = "checking" | "supported" | "unsupported";

const DOWNLOAD_RETRY_COUNT = 8;
const DOWNLOAD_RETRY_DELAY_MS = 3500;

const wait = (durationMs: number) =>
  new Promise((resolve) => setTimeout(resolve, durationMs));

const attemptBackgroundRemoval = async (
  imageUri: string,
  retries = DOWNLOAD_RETRY_COUNT,
  attempt = 1,
): Promise<string> => {
  try {
    debugLog.info("[BG REMOVE] Starting native removal call", {
      imageUri,
      attempt,
      retriesRemaining: retries,
    });

    const result = await removeBackground(imageUri, { trim: false });

    if (!result || result === imageUri) {
      throw new Error("SimulatorError");
    }

    debugLog.info("[BG REMOVE] Native removal succeeded", {
      outputUri: result,
    });

    return result;
  } catch (error) {
    const errorInfo = getBackgroundRemovalErrorInfo(error);

    if (errorInfo.reason === "model-download" && retries > 0) {
      const completedAttempts = DOWNLOAD_RETRY_COUNT - retries + 1;
      const progress = Math.min(
        95,
        Math.round((completedAttempts / DOWNLOAD_RETRY_COUNT) * 100),
      );

      let message = "Downloading the AI model for first use...";
      if (attempt >= 3 && attempt <= 5) {
        message = `Still getting ready... (${progress}% complete)`;
      } else if (attempt > 5) {
        message = "Finishing the download. Hold on for a few seconds.";
      }

      debugLog.warn("[BG REMOVE] Model download still in progress", {
        attempt,
        retriesRemaining: retries,
        rawMessage: errorInfo.rawMessage,
      });

      Toast.show({
        type: "info",
        text1: "Preparing Background Removal",
        text2: message,
        position: "top",
        visibilityTime: DOWNLOAD_RETRY_DELAY_MS,
      });

      await wait(DOWNLOAD_RETRY_DELAY_MS);
      return attemptBackgroundRemoval(imageUri, retries - 1, attempt + 1);
    }

    logBackgroundRemovalFailure("Native removal failed", errorInfo, {
      imageUri,
      attempt,
    });

    throw errorInfo;
  }
};

export const ImageUploadFlowModal: React.FC<ImageUploadFlowModalProps> = ({
  visible,
  imageUri,
  onClose,
  onComplete,
  title = "Prepare Your Upload",
  description = "Remove the background if you want, preview the result, then continue.",
  doneLabel = "Done",
}) => {
  const { theme, isDark } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [transparentImageUri, setTransparentImageUri] = React.useState<
    string | null
  >(null);
  const [preparedImageUri, setPreparedImageUri] = React.useState<string | null>(
    null,
  );
  const [previewMode, setPreviewMode] = React.useState<PreviewMode>("original");
  const [isRemovingBackground, setIsRemovingBackground] = React.useState(false);
  const [isCompleting, setIsCompleting] = React.useState(false);
  const [removalSupportState, setRemovalSupportState] =
    React.useState<RemovalSupportState>("checking");
  const [lastErrorMessage, setLastErrorMessage] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    if (!visible) {
      setTransparentImageUri(null);
      setPreparedImageUri(null);
      setPreviewMode("original");
      setIsRemovingBackground(false);
      setIsCompleting(false);
      setRemovalSupportState("checking");
      setLastErrorMessage(null);
      return;
    }

    setTransparentImageUri(null);
    setPreparedImageUri(null);
    setPreviewMode("original");
    setLastErrorMessage(null);
  }, [imageUri, visible]);

  React.useEffect(() => {
    if (!visible || !imageUri) {
      return;
    }

    let cancelled = false;
    setRemovalSupportState("checking");

    void checkBackgroundRemovalNativeSupport()
      .then((isSupported) => {
        if (!cancelled) {
          setRemovalSupportState(isSupported ? "supported" : "unsupported");
        }
      })
      .catch((error) => {
        logBackgroundRemovalFailure("Support check fallback", error, {
          imageUri,
        });

        if (!cancelled) {
          setRemovalSupportState("supported");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [imageUri, visible]);

  const hasRemovedVersion = !!transparentImageUri;
  const isRemovedPreview = hasRemovedVersion && previewMode === "removed";
  const activeImageUri = isRemovedPreview ? transparentImageUri : imageUri;
  const previewWidth = Math.min(screenWidth - 48, 420);
  const previewHeight = Math.min(screenHeight * 0.5, previewWidth * 1.22);
  const isRemovalAvailable = removalSupportState === "supported";
  const primaryButtonColors = (
    theme.drawingButton?.length ? theme.drawingButton : ["#3E3E3E", "#232323"]
  ) as [string, string, ...string[]];
  const borderColor = isDark ? "rgba(0,0,0,0.14)" : "rgba(28,28,30,0.1)";
  const surfaceColor = theme.cardBackground;
  const segmentedBackground = isDark ? "rgba(0,0,0,0.04)" : "#F4F5F7";
  const activeSegmentBackground = isDark ? "#1A1A1A" : "#FFFFFF";
  const activeSegmentText = isDark ? "#FFFFFF" : "#1C1C1E";

  const handleRemoveBackground = React.useCallback(async () => {
    if (!imageUri || isRemovingBackground || !isRemovalAvailable) {
      return;
    }

    setIsRemovingBackground(true);
    setLastErrorMessage(null);

    try {
      debugLog.info("[BG REMOVE] Flow started from modal", {
        imageUri,
        supportState: removalSupportState,
      });

      const sourceUri =
        preparedImageUri ?? (await prepareBackgroundRemovalSource(imageUri));

      if (sourceUri !== preparedImageUri) {
        setPreparedImageUri(sourceUri);
      }

      debugLog.info("[BG REMOVE] Prepared source ready", {
        originalUri: imageUri,
        workingSourceUri: sourceUri,
      });

      const result = await attemptBackgroundRemoval(sourceUri);
      setTransparentImageUri(result);
      setPreviewMode("removed");

      Toast.show({
        type: "success",
        text1: "Background Removed",
        text2: "Preview the cutout, then continue.",
        position: "top",
        visibilityTime: 1800,
      });
    } catch (error) {
      if (shouldRetryBackgroundRemovalWithFallback(error) && imageUri) {
        try {
          debugLog.warn("[BG REMOVE] Retrying with fallback normalization", {
            imageUri,
          });

          const fallbackSourceUri =
            await prepareBackgroundRemovalFallbackSource(imageUri);
          setPreparedImageUri(fallbackSourceUri);

          const fallbackResult = await attemptBackgroundRemoval(
            fallbackSourceUri,
            DOWNLOAD_RETRY_COUNT,
            1,
          );

          setTransparentImageUri(fallbackResult);
          setPreviewMode("removed");
          setLastErrorMessage(null);

          Toast.show({
            type: "success",
            text1: "Background Removed",
            text2: "Preview the cutout, then continue.",
            position: "top",
            visibilityTime: 1800,
          });
          return;
        } catch (fallbackError) {
          logBackgroundRemovalFailure(
            "Fallback normalization retry failed",
            fallbackError,
            { imageUri },
          );
          error = fallbackError;
        }
      }

      const errorInfo = getBackgroundRemovalErrorInfo(error);

      if (errorInfo.reason === "unsupported") {
        setRemovalSupportState("unsupported");
      }

      setLastErrorMessage(errorInfo.message);
      logBackgroundRemovalFailure("Modal remove background failed", errorInfo, {
        imageUri,
        preparedImageUri,
      });

      Toast.show({
        type: "error",
        text1: "Background Removal Failed",
        text2: errorInfo.message,
        position: "top",
      });
    } finally {
      setIsRemovingBackground(false);
    }
  }, [
    imageUri,
    isRemovingBackground,
    isRemovalAvailable,
    preparedImageUri,
    removalSupportState,
  ]);

  const handleDone = React.useCallback(async () => {
    if (!imageUri || !activeImageUri || isCompleting) {
      return;
    }

    setIsCompleting(true);

    try {
      await onComplete({
        originalUri: imageUri,
        finalUri: activeImageUri,
        transparentUri: transparentImageUri ?? undefined,
        backgroundRemoved: isRemovedPreview,
      });
    } finally {
      setIsCompleting(false);
    }
  }, [
    activeImageUri,
    imageUri,
    isCompleting,
    isRemovedPreview,
    onComplete,
    transparentImageUri,
  ]);

  if (!visible || !imageUri) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safeArea}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.background,
                borderColor,
              },
            ]}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerTextWrap}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>
                  {title}
                </Text>
                <Text
                  style={[styles.description, { color: theme.textSecondary }]}
                >
                  {description}
                </Text>
              </View>

              <Pressable
                onPress={onClose}
                style={[
                  styles.closeButton,
                  {
                    backgroundColor: surfaceColor,
                    borderColor,
                  },
                ]}
              >
                <Image
                  source={ic_close}
                  style={[styles.closeIcon, { tintColor: theme.textPrimary }]}
                  contentFit="contain"
                />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View
                style={[
                  styles.previewWrap,
                  {
                    width: previewWidth,
                    height: previewHeight,
                    borderColor,
                    backgroundColor: surfaceColor,
                  },
                ]}
              >
                <LinearGradient
                  colors={
                    isRemovedPreview
                      ? ["#F7F9FC", "#EDEFF4"]
                      : isDark
                        ? ["#E7E7E7", "#DADADA"]
                        : ["#FFFFFF", "#F5F5F7"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.previewSurface}
                >
                  <Image
                    source={{ uri: activeImageUri ?? undefined }}
                    style={styles.previewImage}
                    contentFit="contain"
                    transition={150}
                    cachePolicy="memory-disk"
                  />
                </LinearGradient>
              </View>

              {hasRemovedVersion ? (
                <View
                  style={[
                    styles.segmentedWrap,
                    {
                      backgroundColor: segmentedBackground,
                      borderColor,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => setPreviewMode("original")}
                    style={[
                      styles.segment,
                      previewMode === "original"
                        ? {
                            backgroundColor: activeSegmentBackground,
                            borderColor,
                          }
                        : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        {
                          color:
                            previewMode === "original"
                              ? activeSegmentText
                              : theme.textSecondary,
                        },
                      ]}
                    >
                      Original
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setPreviewMode("removed")}
                    style={[
                      styles.segment,
                      previewMode === "removed"
                        ? {
                            backgroundColor: activeSegmentBackground,
                            borderColor,
                          }
                        : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        {
                          color:
                            previewMode === "removed"
                              ? activeSegmentText
                              : theme.textSecondary,
                        },
                      ]}
                    >
                      No Background
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {lastErrorMessage ? (
                <Text
                  style={[styles.errorText, { color: theme.textSecondary }]}
                >
                  {lastErrorMessage}
                </Text>
              ) : null}
            </ScrollView>

            <View style={styles.actionRow}>
              {!hasRemovedVersion && removalSupportState === "unsupported" ? (
                <Pressable
                  onPress={handleDone}
                  disabled={isCompleting}
                  style={[
                    styles.primaryButtonPressable,
                    styles.fullWidthAction,
                    isCompleting ? styles.primaryButtonDisabled : null,
                  ]}
                >
                  <LinearGradient
                    colors={primaryButtonColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryButton}
                  >
                    {isCompleting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Use Original</Text>
                    )}
                  </LinearGradient>
                </Pressable>
              ) : !hasRemovedVersion ? (
                <>
                  <Pressable
                    onPress={handleDone}
                    disabled={isCompleting}
                    style={[
                      styles.secondaryButton,
                      {
                        backgroundColor: surfaceColor,
                        borderColor,
                        opacity: isCompleting ? 0.55 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        { color: theme.textPrimary },
                      ]}
                    >
                      Use Original
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleRemoveBackground}
                    disabled={
                      isRemovingBackground ||
                      removalSupportState !== "supported"
                    }
                    style={[
                      styles.primaryButtonPressable,
                      isRemovingBackground ||
                      removalSupportState !== "supported"
                        ? styles.primaryButtonDisabled
                        : null,
                    ]}
                  >
                    <LinearGradient
                      colors={primaryButtonColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.primaryButton}
                    >
                      {isRemovingBackground ||
                      removalSupportState === "checking" ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.primaryButtonText}>
                          Remove Background
                        </Text>
                      )}
                    </LinearGradient>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    onPress={() =>
                      setPreviewMode((current) =>
                        current === "removed" ? "original" : "removed",
                      )
                    }
                    disabled={isCompleting}
                    style={[
                      styles.secondaryButton,
                      {
                        backgroundColor: surfaceColor,
                        borderColor,
                        opacity: isCompleting ? 0.55 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        { color: theme.textPrimary },
                      ]}
                    >
                      {previewMode === "removed"
                        ? "Use Original"
                        : "Use Removed"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleDone}
                    disabled={isCompleting}
                    style={[
                      styles.primaryButtonPressable,
                      isCompleting ? styles.primaryButtonDisabled : null,
                    ]}
                  >
                    <LinearGradient
                      colors={primaryButtonColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.primaryButton}
                    >
                      {isCompleting ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.primaryButtonText}>
                          {doneLabel}
                        </Text>
                      )}
                    </LinearGradient>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.58)",
  },
  safeArea: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sheet: {
    maxHeight: "100%",
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headerTextWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: FontFamily.semibold,
    fontSize: 18,
    lineHeight: 22,
  },
  description: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    width: 16,
    height: 16,
  },
  scrollView: {
    flexShrink: 1,
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 14,
  },
  previewWrap: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  previewSurface: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  segmentedWrap: {
    width: "100%",
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  segmentText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    lineHeight: 17,
  },
  errorText: {
    width: "100%",
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 18,
  },
  fullWidthAction: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    lineHeight: 18,
  },
  primaryButtonPressable: {
    flex: 1.2,
    minHeight: 52,
    borderRadius: 18,
    overflow: "hidden",
  },
  primaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.72,
  },
});
