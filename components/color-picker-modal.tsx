import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import { Dimensions, Modal, ScrollView, StyleSheet, View } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { Pressable, Text } from "./themed"; // Assuming themed exports Text and Pressable
import { Image } from "expo-image";
import { ic_check } from "@/assets/icons";

// import { ic_check } from "@/assets/icons"; // Removed as likely missing, using Ionicons instead

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PICKER_WIDTH = SCREEN_WIDTH - 48;
const PICKER_HEIGHT = 130; // 200
const HUE_BAR_HEIGHT = 30; // 32
const THUMB_SIZE = 22;

// HSV to RGB conversion
const hsvToRgb = (
  h: number,
  s: number,
  v: number,
): [number, number, number] => {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
};

const hexToRgb = (hex: string): [number, number, number] | null => {
  const sanitized = hex.trim().replace("#", "");

  if (sanitized.length === 3) {
    const r = parseInt(`${sanitized[0]}${sanitized[0]}`, 16);
    const g = parseInt(`${sanitized[1]}${sanitized[1]}`, 16);
    const b = parseInt(`${sanitized[2]}${sanitized[2]}`, 16);
    return [r, g, b];
  }

  if (sanitized.length === 6) {
    const r = parseInt(sanitized.substring(0, 2), 16);
    const g = parseInt(sanitized.substring(2, 4), 16);
    const b = parseInt(sanitized.substring(4, 6), 16);
    return [r, g, b];
  }

  return null;
};

const rgbToHsv = (
  r: number,
  g: number,
  b: number,
): [number, number, number] => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return [h, s, v];
};

interface ColorPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectColor: (color: string) => void;
  onSelectGradient?: (colors: [string, string]) => void;
  mode?: "color" | "gradient";
  initialColor?: string;
}

export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  visible,
  onClose,
  onSelectColor,
  onSelectGradient,
  mode = "color",
  initialColor,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Color 1 (or solid color) - Start with a nice vibrant color in center
  const [hue1, setHue1] = useState(180);
  const [saturation1, setSaturation1] = useState(0.7);
  const [brightness1, setBrightness1] = useState(0.8);

  // Color 2 (for gradient) - Start with a complementary color
  const [hue2, setHue2] = useState(320);
  const [saturation2, setSaturation2] = useState(0.7);
  const [brightness2, setBrightness2] = useState(0.8);

  const [activeColor, setActiveColor] = useState<1 | 2>(1);

  // Get current colors
  const rgb1 = hsvToRgb(hue1, saturation1, brightness1);
  const color1 = rgbToHex(...rgb1);
  const rgb2 = hsvToRgb(hue2, saturation2, brightness2);
  const color2 = rgbToHex(...rgb2);

  // Shared values for smooth animation - Start centered
  const hueThumbX = useSharedValue(PICKER_WIDTH / 2);
  const satBrightX = useSharedValue(PICKER_WIDTH * 0.7);
  const satBrightY = useSharedValue(PICKER_HEIGHT * 0.2);
  const thumbScale = useSharedValue(1);

  useEffect(() => {
    if (!visible || mode !== "color" || !initialColor) {
      return;
    }

    const rgb = hexToRgb(initialColor);
    if (!rgb) {
      return;
    }

    const [h, s, v] = rgbToHsv(rgb[0], rgb[1], rgb[2]);
    setHue1(h);
    setSaturation1(s);
    setBrightness1(v);

    hueThumbX.value = (h / 360) * PICKER_WIDTH;
    satBrightX.value = s * PICKER_WIDTH;
    satBrightY.value = (1 - v) * PICKER_HEIGHT;
  }, [visible, mode, initialColor]);

  const updateColor = useCallback(
    (h: number, s: number, b: number) => {
      if (mode === "gradient" && activeColor === 2) {
        setHue2(h);
        setSaturation2(s);
        setBrightness2(b);
      } else {
        setHue1(h);
        setSaturation1(s);
        setBrightness1(b);
      }
    },
    [mode, activeColor],
  );

  // Saturation/Brightness picker gesture
  const satBrightGesture = Gesture.Pan()
    .onBegin(() => {
      thumbScale.value = withSpring(1.2);
    })
    .onUpdate((e) => {
      const x = Math.max(0, Math.min(PICKER_WIDTH, e.x));
      const y = Math.max(0, Math.min(PICKER_HEIGHT, e.y));
      satBrightX.value = x;
      satBrightY.value = y;

      const s = x / PICKER_WIDTH;
      const b = 1 - y / PICKER_HEIGHT;
      const currentHue = mode === "gradient" && activeColor === 2 ? hue2 : hue1;
      scheduleOnRN(updateColor, currentHue, s, b);
    })
    .onEnd(() => {
      thumbScale.value = withSpring(1);
    });

  // Hue picker gesture
  const hueGesture = Gesture.Pan()
    .onBegin(() => {
      thumbScale.value = withSpring(1.2);
    })
    .onUpdate((e) => {
      const x = Math.max(0, Math.min(PICKER_WIDTH, e.x));
      hueThumbX.value = x;

      const h = (x / PICKER_WIDTH) * 360;
      const currentS =
        mode === "gradient" && activeColor === 2 ? saturation2 : saturation1;
      const currentB =
        mode === "gradient" && activeColor === 2 ? brightness2 : brightness1;
      scheduleOnRN(updateColor, h, currentS, currentB);
    })
    .onEnd(() => {
      thumbScale.value = withSpring(1);
    });

  const satBrightThumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: satBrightX.value - THUMB_SIZE / 2 },
      { translateY: satBrightY.value - THUMB_SIZE / 2 },
      { scale: thumbScale.value },
    ],
  }));

  const hueThumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: hueThumbX.value - THUMB_SIZE / 2 },
      { scale: thumbScale.value },
    ],
  }));

  const currentHue = mode === "gradient" && activeColor === 2 ? hue2 : hue1;
  const hueColor = rgbToHex(...hsvToRgb(currentHue, 1, 1));

  const handleApply = () => {
    if (mode === "color") {
      onSelectColor(color1);
    } else {
      if (onSelectGradient) onSelectGradient([color1, color2]);
    }
    onClose();
  };

  const switchActiveColor = (colorNum: 1 | 2) => {
    setActiveColor(colorNum);
    const h = colorNum === 1 ? hue1 : hue2;
    const s = colorNum === 1 ? saturation1 : saturation2;
    const b = colorNum === 1 ? brightness1 : brightness2;
    hueThumbX.value = withSpring((h / 360) * PICKER_WIDTH);
    satBrightX.value = withSpring(s * PICKER_WIDTH);
    satBrightY.value = withSpring((1 - b) * PICKER_HEIGHT);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.modalBackground,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons
                name="close"
                size={24}
                color={isDark ? "#fff" : "#000"}
              />
            </Pressable>
            <Text style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>
              {mode === "color" ? "Pick a Color" : "Create Gradient"}
            </Text>
            <Pressable
              onPress={handleApply}
              style={[
                styles.applyBtn,
                {
                  backgroundColor: isDark ? "rgba(65, 64, 64, 0.45)" : "white",
                  boxShadow: "0px 4px 20px 0px rgba(0, 0, 0, 0.15)" as any, // Cast for TS
                },
              ]}
            >
              <Image
                source={ic_check}
                contentFit="contain"
                style={{ width: 16, height: 16 }}
                tintColor={isDark ? "#fff" : "#000"}
              />
            </Pressable>
          </View>

          {/* Gradient Preview (for gradient mode) */}
          {mode === "gradient" && (
            <View style={styles.gradientPreviewContainer}>
              <LinearGradient
                colors={[color1, color2]}
                style={styles.gradientPreview}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.colorSwitcher}>
                <Pressable
                  onPress={() => switchActiveColor(1)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color1 },
                    activeColor === 1 && styles.activeColorSwatch,
                  ]}
                >
                  {activeColor === 1 && (
                    <Ionicons name="pencil" size={16} color="#fff" />
                  )}
                </Pressable>
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color={theme.textSecondary}
                />
                <Pressable
                  onPress={() => switchActiveColor(2)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color2 },
                    activeColor === 2 && styles.activeColorSwatch,
                  ]}
                >
                  {activeColor === 2 && (
                    <Ionicons name="pencil" size={16} color="#fff" />
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {/* Color Preview (for color mode) */}
          {mode === "color" && (
            <View style={styles.colorPreviewContainer}>
              <View
                style={[styles.colorPreview, { backgroundColor: color1 }]}
              />
            </View>
          )}

          {/* Saturation/Brightness Picker */}

          <GestureDetector gesture={satBrightGesture}>
            <View style={styles.satBrightPicker}>
              <LinearGradient
                colors={["#fff", hueColor]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <LinearGradient
                colors={["transparent", "#000"]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              <Animated.View style={[styles.thumb, satBrightThumbStyle]}>
                <View
                  style={[
                    styles.thumbInner,
                    {
                      backgroundColor:
                        mode === "gradient" && activeColor === 2
                          ? color2
                          : color1,
                    },
                  ]}
                />
              </Animated.View>
            </View>
          </GestureDetector>

          {/* Hue Picker */}
          <GestureDetector gesture={hueGesture}>
            <View style={styles.huePicker}>
              <LinearGradient
                colors={[
                  "#FF0000",
                  "#FFFF00",
                  "#00FF00",
                  "#00FFFF",
                  "#0000FF",
                  "#FF00FF",
                  "#FF0000",
                ]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <Animated.View style={[styles.hueThumb, hueThumbStyle]}>
                <View
                  style={[styles.thumbInner, { backgroundColor: hueColor }]}
                />
              </Animated.View>
            </View>
          </GestureDetector>

          {/* Quick Colors */}
          <View style={styles.quickColorsContainer}>
            <ScrollView
              horizontal
              style={styles.quickColors}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingHorizontal: 24 }}
            >
              {[
                "#FF6B6B",
                "#4ECDC4",
                "#45B7D1",
                "#96CEB4",
                "#F39C12",
                "#9B59B6",
                "#E74C3C",
                "#1ABC9C",
                "#FFFFFF",
                "#000000",
              ].map((c) => (
                <Pressable
                  key={c}
                  onPress={() => {
                    const rgb = hexToRgb(c);
                    if (rgb) {
                      const [h, s, v] = rgbToHsv(rgb[0], rgb[1], rgb[2]);
                      setHue1(h);
                      setSaturation1(s);
                      setBrightness1(v);
                      hueThumbX.value = (h / 360) * PICKER_WIDTH;
                      satBrightX.value = s * PICKER_WIDTH;
                      satBrightY.value = (1 - v) * PICKER_HEIGHT;
                    }

                    if (mode === "color") {
                      onSelectColor(c);
                      onClose();
                    } else {
                      // Gradient quick-pick not used in this screen yet.
                    }
                  }}
                  style={[
                    styles.quickColor,
                    { backgroundColor: c },
                    c === "#FFFFFF" && {
                      borderWidth: 1,
                      borderColor: theme.borderPrimary,
                    },
                  ]}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: FontFamily.semibold,
  },
  applyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  gradientPreviewContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  gradientPreview: {
    height: 55,
    borderRadius: 16,
    marginBottom: 12,
  },
  colorSwitcher: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  colorSwatch: {
    width: 45,
    height: 45,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  activeColorSwatch: {
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  colorPreviewContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
    alignItems: "center",
  },
  colorPreview: {
    width: 70,
    height: 70,
    borderRadius: 40,
    marginBottom: 8,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.3)",
  },
  colorHex: {
    fontSize: 16,
    fontFamily: FontFamily.medium,
  },
  satBrightPicker: {
    width: PICKER_WIDTH,
    height: PICKER_HEIGHT,
    marginHorizontal: 24,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  huePicker: {
    width: PICKER_WIDTH,
    height: HUE_BAR_HEIGHT,
    marginHorizontal: 24,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  hueThumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    top: (HUE_BAR_HEIGHT - THUMB_SIZE) / 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbInner: {
    width: THUMB_SIZE - 6,
    height: THUMB_SIZE - 6,
    borderRadius: (THUMB_SIZE - 6) / 2,
  },
  quickColorsContainer: {
    // paddingHorizontal: 24,
  },
  quickColors: {
    flexDirection: "row",
    // flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  quickColor: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});
