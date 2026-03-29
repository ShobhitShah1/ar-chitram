import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { SolidDrawMode } from "@/features/virtual-creativity/store/virtual-creativity-store";
import { ic_check } from "@/assets/icons";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Switch,
  useWindowDimensions,
  View,
} from "react-native";
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

import { ControlledBottomSheet } from "@/components/controlled-bottom-sheet";
import { Pressable, Text } from "@/components/themed";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PICKER_WIDTH = SCREEN_WIDTH - 48;
const PICKER_HEIGHT = 130;
const HUE_BAR_HEIGHT = 30;
const THUMB_SIZE = 22;
const COLOR_SHEET_MIN_HEIGHT = 420;
const COLOR_SHEET_PREFERRED_HEIGHT = 560;
const GRADIENT_SHEET_PREFERRED_HEIGHT = 470;

const DEFAULT_SOLID_MODE: SolidDrawMode = "object-draw";

const hsvToRgb = (
  h: number,
  s: number,
  v: number,
): [number, number, number] => {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
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
    if (h < 0) {
      h += 360;
    }
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return [h, s, v];
};

interface ColorPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectColor: (color: string, solidMode: SolidDrawMode) => void;
  onSelectGradient?: (colors: [string, string]) => void;
  isDrawModeActive?: boolean;
  onDrawModeChange?: (enabled: boolean) => void;
  bottomInset?: number;
  mode?: "color" | "gradient";
  initialColor?: string;
  initialSolidMode?: SolidDrawMode;
}

export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  visible,
  onClose,
  onSelectColor,
  onSelectGradient,
  isDrawModeActive = false,
  onDrawModeChange,
  bottomInset = 0,
  mode = "color",
  initialColor,
  initialSolidMode,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  const [hue1, setHue1] = useState(180);
  const [saturation1, setSaturation1] = useState(0.7);
  const [brightness1, setBrightness1] = useState(0.8);

  const [hue2, setHue2] = useState(320);
  const [saturation2, setSaturation2] = useState(0.7);
  const [brightness2, setBrightness2] = useState(0.8);

  const [activeColor, setActiveColor] = useState<1 | 2>(1);
  const solidMode: SolidDrawMode = DEFAULT_SOLID_MODE;

  const rgb1 = hsvToRgb(hue1, saturation1, brightness1);
  const color1 = rgbToHex(...rgb1);
  const rgb2 = hsvToRgb(hue2, saturation2, brightness2);
  const color2 = rgbToHex(...rgb2);

  const hueThumbX = useSharedValue(PICKER_WIDTH / 2);
  const satBrightX = useSharedValue(PICKER_WIDTH * 0.7);
  const satBrightY = useSharedValue(PICKER_HEIGHT * 0.2);
  const thumbScale = useSharedValue(1);

  const syncPickerState = useCallback(() => {
    if (mode === "color") {
      setActiveColor(1);

      if (!initialColor) {
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
      return;
    }

    setActiveColor(1);
  }, [hueThumbX, initialColor, initialSolidMode, mode, satBrightX, satBrightY]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    syncPickerState();
  }, [syncPickerState, visible]);

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
    [activeColor, mode],
  );

  const satBrightGesture = Gesture.Pan()
    .onBegin(() => {
      thumbScale.value = withSpring(1.2);
    })
    .onUpdate((event) => {
      const x = Math.max(0, Math.min(PICKER_WIDTH, event.x));
      const y = Math.max(0, Math.min(PICKER_HEIGHT, event.y));
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

  const hueGesture = Gesture.Pan()
    .onBegin(() => {
      thumbScale.value = withSpring(1.2);
    })
    .onUpdate((event) => {
      const x = Math.max(0, Math.min(PICKER_WIDTH, event.x));
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
  const sheetContentBottomPadding =
    Math.max(insets.bottom - bottomInset, 0) + 16;

  const handleApply = useCallback(() => {
    if (mode === "color") {
      onSelectColor(color1, solidMode);
    } else if (onSelectGradient) {
      onSelectGradient([color1, color2]);
    }
    onClose();
  }, [
    color1,
    color2,
    mode,
    onClose,
    onSelectColor,
    onSelectGradient,
    solidMode,
  ]);

  const switchActiveColor = useCallback(
    (colorNum: 1 | 2) => {
      setActiveColor(colorNum);
      const h = colorNum === 1 ? hue1 : hue2;
      const s = colorNum === 1 ? saturation1 : saturation2;
      const b = colorNum === 1 ? brightness1 : brightness2;
      hueThumbX.value = withSpring((h / 360) * PICKER_WIDTH);
      satBrightX.value = withSpring(s * PICKER_WIDTH);
      satBrightY.value = withSpring((1 - b) * PICKER_HEIGHT);
    },
    [
      brightness1,
      brightness2,
      hue1,
      hue2,
      hueThumbX,
      saturation1,
      saturation2,
      satBrightX,
      satBrightY,
    ],
  );

  const sheetMaxHeight = Math.min(screenHeight - 12, screenHeight * 0.86);
  const sheetPreferredHeight = Math.min(
    sheetMaxHeight,
    Math.max(
      COLOR_SHEET_MIN_HEIGHT,
      mode === "color"
        ? COLOR_SHEET_PREFERRED_HEIGHT
        : GRADIENT_SHEET_PREFERRED_HEIGHT,
    ),
  );

  return (
    <ControlledBottomSheet
      visible={visible}
      onClose={onClose}
      onWillPresent={syncPickerState}
      snapPoints={[sheetPreferredHeight]}
      bottomInset={bottomInset}
      enableDynamicSizing
      showHandle={false}
      backgroundStyle={styles.sheetBackground}
      contentContainerStyle={styles.sheetContent}
    >
      <GestureHandlerRootView style={styles.sheetRoot}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: isDark ? "#F5F5F5" : "#FFFFFF",
              paddingBottom: sheetContentBottomPadding,
              maxHeight: sheetMaxHeight,
            },
          ]}
        >
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#000" />
            </Pressable>
            <Text style={styles.title}>
              {mode === "color" ? "Pick a Color" : "Create Gradient"}
            </Text>
            <Pressable
              onPress={handleApply}
              style={[
                styles.applyBtn,
                {
                  backgroundColor: "#FFFFFF",
                  boxShadow: "0px 4px 20px 0px rgba(0, 0, 0, 0.15)",
                },
              ]}
            >
              <Image
                source={ic_check}
                contentFit="contain"
                style={{ width: 16, height: 16 }}
                tintColor="#000"
              />
            </Pressable>
          </View>

          {mode === "gradient" ? (
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
                  {activeColor === 1 ? (
                    <Ionicons name="pencil" size={16} color="#fff" />
                  ) : null}
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
                  {activeColor === 2 ? (
                    <Ionicons name="pencil" size={16} color="#fff" />
                  ) : null}
                </Pressable>
              </View>
            </View>
          ) : null}

          {mode === "color" ? (
            <>
              <View style={styles.colorPreviewContainer}>
                <View
                  style={[styles.colorPreview, { backgroundColor: color1 }]}
                />
              </View>

              <View style={styles.drawToggleSection}>
                <Text style={styles.drawToggleLabel}>Canvas Draw</Text>
                <Switch
                  value={isDrawModeActive}
                  onValueChange={onDrawModeChange}
                  trackColor={{
                    false: "rgba(0,0,0,0.14)",
                    true: "#000000",
                  }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="rgba(0,0,0,0.14)"
                />
              </View>
            </>
          ) : null}

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
              ].map((color) => (
                <Pressable
                  key={color}
                  onPress={() => {
                    const rgb = hexToRgb(color);
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
                      onSelectColor(color, solidMode);
                      onClose();
                    }
                  }}
                  style={[
                    styles.quickColor,
                    { backgroundColor: color },
                    color === "#FFFFFF"
                      ? {
                          borderWidth: 1,
                          borderColor: "rgba(0,0,0,0.12)",
                        }
                      : null,
                  ]}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </GestureHandlerRootView>
    </ControlledBottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "transparent",
    borderWidth: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetContent: {
    flex: 0,
  },
  sheetRoot: {
    width: "100%",
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
    color: "#000",
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
    marginBottom: 14,
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
  drawToggleSection: {
    marginHorizontal: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  drawToggleLabel: {
    fontSize: 14,
    fontFamily: FontFamily.semibold,
    color: "#000000",
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
  quickColorsContainer: {},
  quickColors: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  quickColor: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});
