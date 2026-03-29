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
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
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

const SPRING = { damping: 20, stiffness: 220, mass: 0.9 };
const SOFT_SPRING = { damping: 28, stiffness: 180, mass: 1 };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const attemptBackgroundRemoval = async (
  imageUri: string,
  retries = DOWNLOAD_RETRY_COUNT,
  attempt = 1,
): Promise<string> => {
  try {
    debugLog.info("[BG REMOVE] Starting", {
      imageUri,
      attempt,
      retriesRemaining: retries,
    });
    const result = await removeBackground(imageUri, { trim: false });
    if (!result || result === imageUri) throw new Error("SimulatorError");
    debugLog.info("[BG REMOVE] Succeeded", { outputUri: result });
    return result;
  } catch (error) {
    const errorInfo = getBackgroundRemovalErrorInfo(error);

    if (errorInfo.reason === "model-download" && retries > 0) {
      const completed = DOWNLOAD_RETRY_COUNT - retries + 1;
      const progress = Math.min(
        95,
        Math.round((completed / DOWNLOAD_RETRY_COUNT) * 100),
      );
      let message = "Downloading the AI model for first use...";
      if (attempt >= 3 && attempt <= 5)
        message = `Still getting ready... (${progress}% complete)`;
      else if (attempt > 5) message = "Almost done. Hold on a few seconds.";

      debugLog.warn("[BG REMOVE] Model downloading", {
        attempt,
        retriesRemaining: retries,
      });
      Toast.show({
        type: "info",
        text1: "Preparing AI Model",
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ImageProcessScanner({ visible }: { visible: boolean }) {
  const shimmerPos = useSharedValue(-1);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 400 });
      shimmerPos.value = withRepeat(
        withTiming(1.5, { duration: 1600, easing: Easing.linear }),
        -1,
      );
    } else {
      opacity.value = withTiming(0, { duration: 250 });
      shimmerPos.value = -1;
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shimmerPos.value, [-1, 1.5], [-400, 400]) },
      { rotate: "25deg" },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(opacity.value, [0, 1], [0, 0.8]),
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.scannerContainer, containerStyle]}
      pointerEvents="none"
    >
      <BlurView intensity={24} style={StyleSheet.absoluteFill} tint="dark" />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(0,0,0,0.25)" },
        ]}
      />

      <Animated.View style={[styles.shimmerBox, shimmerStyle]}>
        <LinearGradient
          colors={[
            "transparent",
            "rgba(255,255,255,0.03)",
            "rgba(255,255,255,0.15)",
            "rgba(255,255,255,0.03)",
            "transparent",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View style={[styles.scannerContent, labelStyle]}>
        <BounceDots white />
        <Text style={styles.scannerText}>Processing Image...</Text>
      </Animated.View>
    </Animated.View>
  );
}

function VisualModeSwitch({
  mode,
  onChange,
  isDark,
}: {
  mode: PreviewMode;
  onChange: (m: PreviewMode) => void;
  isDark: boolean;
}) {
  const slide = useSharedValue(mode === "original" ? 0 : 1);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    slide.value = withSpring(mode === "original" ? 0 : 1, {
      ...SOFT_SPRING,
      stiffness: 200,
    });
  }, [mode]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(slide.value, [0, 1], [0, 81]) }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.045)";
  const indicatorBg = isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,1)";
  const activeColor = isDark ? "#FFFFFF" : "#000000";
  const inactiveColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";

  const shadow = !isDark
    ? {
        boxShadow: "0px 2px 4px 0px rgba(0, 0, 0, 0.08)",
      }
    : {};

  return (
    <Animated.View style={[styles.modeSwitch, { backgroundColor: bg }, containerStyle]}>
      <Animated.View
        style={[
          styles.modeIndicator,
          { backgroundColor: indicatorBg, ...shadow },
          indicatorStyle,
        ]}
      />
      <Pressable
        onPressIn={() => (scale.value = withSpring(0.96, SPRING))}
        onPressOut={() => (scale.value = withSpring(1, SPRING))}
        onPress={() => onChange("original")}
        style={styles.modeBtn}
      >
        <Ionicons
          name="image-outline"
          size={16}
          color={mode === "original" ? activeColor : inactiveColor}
        />
        <Text
          style={[
            styles.modeText,
            { color: mode === "original" ? activeColor : inactiveColor },
          ]}
        >
          Orig
        </Text>
      </Pressable>
      <Pressable
        onPressIn={() => (scale.value = withSpring(0.96, SPRING))}
        onPressOut={() => (scale.value = withSpring(1, SPRING))}
        onPress={() => onChange("removed")}
        style={styles.modeBtn}
      >
        <Ionicons
          name="cut-outline"
          size={16}
          color={mode === "removed" ? activeColor : inactiveColor}
        />
        <Text
          style={[
            styles.modeText,
            { color: mode === "removed" ? activeColor : inactiveColor },
          ]}
        >
          Cutout
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function CheckerBoard() {
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
      {Array.from({ length: 8 }).map((_, row) =>
        Array.from({ length: 8 }).map((_, col) => (
          <View
            key={`${row}-${col}`}
            style={{
              position: "absolute",
              width: "12.5%",
              height: "12.5%",
              left: `${col * 12.5}%`,
              top: `${row * 12.5}%`,
              backgroundColor:
                (row + col) % 2 === 0
                  ? "rgba(155,155,175,0.13)"
                  : "transparent",
            }}
          />
        )),
      )}
    </View>
  );
}

function ActionBtn({
  onPress,
  disabled,
  loading,
  label,
  primary,
  colors,
  bg,
  border,
  textColor,
  flex = 1,
}: {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  label: string;
  primary?: boolean;
  colors?: [string, string, ...string[]];
  bg?: string;
  border?: string;
  textColor?: string;
  flex?: number;
}) {
  const scale = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(0.95, SPRING);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING);
      }}
      onPress={onPress}
      disabled={disabled}
      style={[
        scaleStyle,
        styles.btn,
        { flex, opacity: disabled ? 0.58 : 1 },
        !primary && {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 1,
        },
        primary && { overflow: "hidden" },
      ]}
    >
      {primary && colors && (
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {loading ? (
        <BounceDots white={primary} />
      ) : (
        <Text style={[styles.btnText, { color: primary ? "#FFF" : textColor }]}>
          {label}
        </Text>
      )}
    </AnimatedPressable>
  );
}

function BounceDots({ white }: { white?: boolean }) {
  const svs = [useSharedValue(0), useSharedValue(0), useSharedValue(0)];

  React.useEffect(() => {
    svs.forEach((sv, i) => {
      sv.value = withDelay(
        i * 140,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 360, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 360, easing: Easing.in(Easing.quad) }),
          ),
          -1,
        ),
      );
    });
    return () => svs.forEach(cancelAnimation);
  }, []);

  return (
    <View
      style={{ flexDirection: "row", gap: 5, alignItems: "center", height: 20 }}
    >
      {svs.map((sv, i) => {
        const dotStyle = useAnimatedStyle(() => ({
          transform: [{ translateY: interpolate(sv.value, [0, 1], [0, -5]) }],
          opacity: interpolate(sv.value, [0, 1], [0.38, 1]),
        }));
        return (
          <Animated.View
            key={i}
            style={[
              {
                width: 5,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: white ? "#fff" : "#1C1C1E",
              },
              dotStyle,
            ]}
          />
        );
      })}
    </View>
  );
}

export const ImageUploadFlowModal: React.FC<ImageUploadFlowModalProps> = ({
  visible,
  imageUri,
  onClose,
  onComplete,
  title = "Prepare Your Image",
  doneLabel = "Continue",
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

  const sheetY = useSharedValue(screenHeight);
  const backdropOpacity = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const cardY = useSharedValue(0);

  const hasRemovedVersion = !!transparentImageUri;
  const isRemovedPreview = hasRemovedVersion && previewMode === "removed";
  const activeImageUri = isRemovedPreview ? transparentImageUri : imageUri;
  const previewWidth = screenWidth - 32;
  const previewHeight = Math.min(screenHeight * 0.44, 340);

  const primaryColors = (
    theme.drawingButton?.length ? theme.drawingButton : ["#3E3E3E", "#232323"]
  ) as [string, string, ...string[]];

  const sheetBg = isDark ? "#0E0E12" : "#F7F7F9";
  const cardBg = isDark ? "#18181D" : "#FFFFFF";
  const borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const bodyText = isDark ? "rgba(255,255,255,0.88)" : "#1C1C1E";
  const dimText = isDark ? "rgba(255,255,255,0.36)" : "rgba(0,0,0,0.35)";
  const secBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
  const secBorder = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)";

  React.useEffect(() => {
    if (visible) {
      sheetY.value = withSpring(0, { damping: 26, stiffness: 230, mass: 1.1 });
      backdropOpacity.value = withTiming(1, { duration: 300 });
    } else {
      sheetY.value = withSpring(screenHeight, SPRING);
      backdropOpacity.value = withTiming(0, { duration: 220 });
    }
  }, [visible, screenHeight]);

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
    if (!visible || !imageUri) return;
    let cancelled = false;
    setRemovalSupportState("checking");

    void checkBackgroundRemovalNativeSupport()
      .then((s) => {
        if (!cancelled) setRemovalSupportState(s ? "supported" : "unsupported");
      })
      .catch((e) => {
        logBackgroundRemovalFailure("Support check fallback", e, { imageUri });
        if (!cancelled) setRemovalSupportState("supported");
      });

    return () => {
      cancelled = true;
    };
  }, [imageUri, visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }, { translateY: cardY.value }],
  }));

  const handleRemoveBackground = React.useCallback(async () => {
    if (
      !imageUri ||
      isRemovingBackground ||
      removalSupportState !== "supported"
    )
      return;

    setIsRemovingBackground(true);
    setLastErrorMessage(null);
    cardY.value = withSpring(-3, SPRING);

    try {
      const sourceUri =
        preparedImageUri ?? (await prepareBackgroundRemovalSource(imageUri));
      if (sourceUri !== preparedImageUri) setPreparedImageUri(sourceUri);

      debugLog.info("[BG REMOVE] Source ready", {
        originalUri: imageUri,
        sourceUri,
      });

      const result = await attemptBackgroundRemoval(sourceUri);

      setTransparentImageUri(result);
      setPreviewMode("removed");

      cardY.value = withSpring(0, SPRING);
      cardScale.value = withSequence(
        withSpring(1.03, { damping: 10, stiffness: 260 }),
        withSpring(1, SOFT_SPRING),
      );

      Toast.show({
        type: "success",
        text1: "Background Removed",
        text2: "Looking clean ✨",
        position: "top",
        visibilityTime: 1800,
      });
    } catch (error) {
      if (shouldRetryBackgroundRemovalWithFallback(error) && imageUri) {
        try {
          debugLog.warn("[BG REMOVE] Retrying with fallback", { imageUri });
          const fallback =
            await prepareBackgroundRemovalFallbackSource(imageUri);
          setPreparedImageUri(fallback);
          const fallbackResult = await attemptBackgroundRemoval(
            fallback,
            DOWNLOAD_RETRY_COUNT,
            1,
          );

          setTransparentImageUri(fallbackResult);
          setPreviewMode("removed");
          setLastErrorMessage(null);
          cardY.value = withSpring(0, SPRING);
          cardScale.value = withSequence(
            withSpring(1.03, { damping: 10, stiffness: 260 }),
            withSpring(1, SOFT_SPRING),
          );
          Toast.show({
            type: "success",
            text1: "Background Removed",
            text2: "Looking clean ✨",
            position: "top",
            visibilityTime: 1800,
          });
          return;
        } catch (fallbackError) {
          logBackgroundRemovalFailure("Fallback retry failed", fallbackError, {
            imageUri,
          });
          error = fallbackError;
        }
      }

      const errorInfo = getBackgroundRemovalErrorInfo(error);
      if (errorInfo.reason === "unsupported")
        setRemovalSupportState("unsupported");

      cardY.value = withSpring(0, SPRING);
      setLastErrorMessage(errorInfo.message);
      logBackgroundRemovalFailure("Modal remove background failed", errorInfo, {
        imageUri,
      });
      Toast.show({
        type: "error",
        text1: "Removal Failed",
        text2: errorInfo.message,
        position: "top",
      });
    } finally {
      setIsRemovingBackground(false);
    }
  }, [imageUri, isRemovingBackground, removalSupportState, preparedImageUri]);

  const handleDone = React.useCallback(async () => {
    if (!imageUri || !activeImageUri || isCompleting) return;
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

  if (!visible || !imageUri) return null;

  const isLoading = isRemovingBackground || removalSupportState === "checking";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[styles.sheet, { backgroundColor: sheetBg }, sheetStyle]}
      >
        <SafeAreaView edges={["bottom"]} style={styles.inner}>
          <View style={styles.dragRow}>
            <View
              style={[
                styles.drag,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.14)"
                    : "rgba(0,0,0,0.11)",
                },
              ]}
            />
          </View>

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: bodyText }]}>{title}</Text>
              <Text
                style={[styles.subtitle, { color: dimText }]}
                numberOfLines={1}
              >
                {lastErrorMessage
                  ? lastErrorMessage
                  : hasRemovedVersion
                    ? isRemovedPreview
                      ? "Background removed — tap Continue when ready"
                      : "Showing original — tap to compare"
                    : "Remove the background or use it as-is"}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: secBg, borderColor: secBorder },
              ]}
            >
              <Image
                source={ic_close}
                style={[styles.closeIcon, { tintColor: bodyText }]}
                contentFit="contain"
              />
            </Pressable>
          </View>

          <Animated.View
            style={[
              styles.card,
              {
                width: previewWidth,
                height: previewHeight,
                backgroundColor: cardBg,
                borderColor,
              },
              cardStyle,
            ]}
          >
            <LinearGradient
              colors={
                isRemovedPreview
                  ? isDark
                    ? ["#151520", "#111118"]
                    : ["#EEEEFF", "#E4E8FF"]
                  : isDark
                    ? ["#202028", "#18181E"]
                    : ["#FFFFFF", "#F4F4F8"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            {isRemovedPreview && <CheckerBoard />}

            <Image
              source={{ uri: activeImageUri ?? undefined }}
              style={styles.image}
              contentFit="scale-down"
              transition={200}
              cachePolicy="memory-disk"
            />

            <ImageProcessScanner visible={isRemovingBackground} />

            {!isRemovingBackground}
          </Animated.View>

          <View style={styles.actions}>
            {!hasRemovedVersion && removalSupportState === "unsupported" ? (
              <ActionBtn
                onPress={handleDone}
                disabled={isCompleting}
                loading={isCompleting}
                label="Use as Original"
                primary
                colors={primaryColors}
                flex={1}
              />
            ) : !hasRemovedVersion ? (
              <>
                <ActionBtn
                  onPress={handleDone}
                  disabled={isCompleting}
                  loading={isCompleting}
                  label="Use Original"
                  bg={secBg}
                  border={secBorder}
                  textColor={bodyText}
                />
                <ActionBtn
                  onPress={handleRemoveBackground}
                  disabled={isLoading}
                  loading={isLoading}
                  label="Remove Background"
                  primary
                  colors={primaryColors}
                />
              </>
            ) : (
              <>
                <VisualModeSwitch
                  mode={previewMode}
                  onChange={setPreviewMode}
                  isDark={isDark}
                />
                <ActionBtn
                  onPress={handleDone}
                  disabled={isCompleting}
                  loading={isCompleting}
                  label={doneLabel}
                  primary
                  colors={primaryColors}
                  flex={1.2}
                />
              </>
            )}
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  inner: {
    alignItems: "center",
    gap: 16,
    paddingBottom: 10,
  },
  dragRow: {
    paddingTop: 12,
    paddingBottom: 2,
    alignItems: "center",
  },
  drag: {
    width: 34,
    height: 4,
    borderRadius: 2,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: FontFamily.semibold,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    width: 14,
    height: 14,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  toggleWrap: {
    position: "absolute",
    bottom: 14,
    alignSelf: "center",
  },
  modeSwitch: {
    flexDirection: "row",
    borderRadius: 18,
    padding: 5,
    position: "relative",
    height: 54,
    width: 172,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  modeIndicator: {
    position: "absolute",
    left: 5,
    top: 5,
    bottom: 5,
    width: 81,
    borderRadius: 13,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    zIndex: 1,
  },
  modeText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    lineHeight: 16,
  },
  scannerContainer: {
    borderRadius: 24,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  shimmerBox: {
    position: "absolute",
    width: "180%",
    height: "100%",
    zIndex: 1,
  },
  scannerContent: {
    position: "absolute",
    bottom: 24,
    width: "100%",
    alignItems: "center",
  },
  scannerText: {
    color: "#fff",
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.1,
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 2,
    width: "100%",
  },
  btn: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  btnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
});
