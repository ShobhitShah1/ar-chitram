import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { SheetHeader } from "@/features/virtual-creativity/components/sheet-header";
import type { SignatureSelection } from "@/features/virtual-creativity/constants/editor-presets";
import {
  ARTIST_SIGNATURE_PRESETS,
  SIGNATURE_FONT_PRESETS,
  SIGNATURE_OUTLINE_FONT_PRESETS,
} from "@/features/virtual-creativity/constants/editor-presets";
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Dimensions,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

type SignatureTab = "artist" | "custom" | "text";

interface SignatureModalProps {
  visible: boolean;
  selectedSignatureId?: string | null;
  defaultName?: string;
  bottomInset?: number;
  onClose: () => void;
  onApply: (selection: SignatureSelection) => void;
}

const getPreviewFontSize = (
  value: string,
  largeSize: number,
  minimumSize: number,
) => {
  const length = value.trim().length;

  if (length <= 10) {
    return largeSize;
  }

  if (length <= 16) {
    return largeSize - 6;
  }

  if (length <= 22) {
    return largeSize - 10;
  }

  return minimumSize;
};

const getCaptureTextWidth = (value: string) => {
  const length = value.trim().length;
  return Math.max(900, Math.min(3200, length * 110 + 240));
};

const SignatureModalComponent: React.FC<SignatureModalProps> = ({
  visible,
  selectedSignatureId,
  defaultName = "AR Chitram",
  bottomInset = 0,
  onClose,
  onApply,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get("window").height;
  const bottomSheetModalRef = React.useRef<BottomSheetModal>(null);

  const [tab, setTab] = React.useState<SignatureTab>("artist");
  const [typedName, setTypedName] = React.useState("");
  const [selectedCustomFontId, setSelectedCustomFontId] = React.useState(
    SIGNATURE_FONT_PRESETS[0].id,
  );
  const [selectedArtistId, setSelectedArtistId] = React.useState(
    ARTIST_SIGNATURE_PRESETS[0].id,
  );
  const [selectedOutlineFontId, setSelectedOutlineFontId] = React.useState(
    SIGNATURE_OUTLINE_FONT_PRESETS[0].id,
  );

  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);

  React.useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      setIsKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
      bottomSheetModalRef.current?.snapToIndex(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  React.useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible]);

  React.useEffect(() => {
    if (!visible) {
      // Reset to defaults when modal is closed
      setTab("artist");
      setSelectedArtistId(ARTIST_SIGNATURE_PRESETS[0].id);
      setSelectedCustomFontId(SIGNATURE_FONT_PRESETS[0].id);
      setSelectedOutlineFontId(SIGNATURE_OUTLINE_FONT_PRESETS[0].id);
      setTypedName("");
      return;
    }

    if (selectedSignatureId?.startsWith("artist-")) {
      setTab("artist");
      setSelectedArtistId(selectedSignatureId);
    } else if (selectedSignatureId?.startsWith("font-")) {
      setTab("custom");
      setSelectedCustomFontId(selectedSignatureId);
    } else if (selectedSignatureId?.startsWith("text-")) {
      setTab("text");
    }
    setTypedName("");
  }, [selectedSignatureId, visible, defaultName]);

  const customTextCaptureRef = React.useRef<View>(null);
  const textSvgRef = React.useRef<View>(null);
  const [isCapturing, setIsCapturing] = React.useState(false);

  const customPreviewName = typedName.trim() || defaultName;
  const customPreviewFontSize = React.useMemo(
    () => getPreviewFontSize(customPreviewName, 30, 18),
    [customPreviewName],
  );
  const textPreviewFontSize = React.useMemo(
    () => getPreviewFontSize(customPreviewName, 28, 15),
    [customPreviewName],
  );
  const captureTextWidth = React.useMemo(
    () => getCaptureTextWidth(customPreviewName),
    [customPreviewName],
  );

  const selectedOutlineFont = React.useMemo(
    () =>
      SIGNATURE_OUTLINE_FONT_PRESETS.find(
        (f) => f.id === selectedOutlineFontId,
      ) ?? SIGNATURE_OUTLINE_FONT_PRESETS[0],
    [selectedOutlineFontId],
  );
  const selectedCustomFont = React.useMemo(
    () =>
      SIGNATURE_FONT_PRESETS.find((f) => f.id === selectedCustomFontId) ??
      SIGNATURE_FONT_PRESETS[0],
    [selectedCustomFontId],
  );

  const handleApply = React.useCallback(async () => {
    if (tab === "text" || tab === "custom") {
      const captureTarget =
        tab === "text" ? textSvgRef.current : customTextCaptureRef.current;
      const captureFontFamily =
        tab === "text"
          ? selectedOutlineFont.fontFamily
          : selectedCustomFont.fontFamily;
      const captureIdPrefix = tab === "text" ? "text" : selectedCustomFont.id;

      if (!captureTarget || isCapturing) return;
      setIsCapturing(true);
      try {
        const uri = await captureRef(captureTarget, {
          format: "png",
          quality: 1,
        });
        onApply({
          id: `${captureIdPrefix}-${Date.now()}`,
          value: customPreviewName,
          fontFamily: captureFontFamily,
          isArtistPreset: false,
          isTextAsLayer: true,
          textLayerUri: uri,
        });
      } catch (err) {
        console.warn("Failed to capture text layer:", err);
      } finally {
        setIsCapturing(false);
      }
      return;
    }

    if (tab === "artist") {
      const selectedArtist =
        ARTIST_SIGNATURE_PRESETS.find((item) => item.id === selectedArtistId) ??
        ARTIST_SIGNATURE_PRESETS[0];
      onApply({
        id: selectedArtist.id,
        value: customPreviewName,
        fontFamily: selectedArtist.fontFamily,
        isArtistPreset: true,
        presetImageSource: selectedArtist.icon,
      });
      return;
    }
  }, [
    onApply,
    selectedArtistId,
    tab,
    isCapturing,
    customPreviewName,
    selectedCustomFont.fontFamily,
    selectedCustomFont.id,
    selectedOutlineFont.fontFamily,
  ]);

  const renderCustomFont = React.useCallback(
    ({ item }: { item: (typeof SIGNATURE_FONT_PRESETS)[number] }) => {
      const selected = item.id === selectedCustomFontId;
      return (
        <Pressable
          onPress={() => setSelectedCustomFontId(item.id)}
          style={[
            styles.customSignatureRow,
            selected ? styles.signatureRowSelected : styles.signatureRowFaded,
          ]}
        >
          <View style={styles.customSignaturePreviewBox}>
            <Text
              style={[
                styles.customSignatureText,
                {
                  color: "#000",
                  fontFamily: item.fontFamily,
                  fontSize: customPreviewFontSize,
                },
              ]}
              adjustsFontSizeToFit
              minimumFontScale={0.2}
              numberOfLines={1}
              selectable={false}
            >
              {customPreviewName}
            </Text>
          </View>
        </Pressable>
      );
    },
    [customPreviewFontSize, customPreviewName, selectedCustomFontId],
  );

  const renderArtistItem = React.useCallback(
    ({ item }: { item: (typeof ARTIST_SIGNATURE_PRESETS)[number] }) => {
      const selected = item.id === selectedArtistId;
      return (
        <Pressable
          onPress={() => setSelectedArtistId(item.id)}
          style={[
            styles.artistTile,
            {
              borderColor: selected ? "#1D1D1D" : "rgba(20,20,20,0.06)",
              backgroundColor: "#F2F2F2",
            },
          ]}
        >
          {item.icon && (
            <Image
              source={item.icon}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
            />
          )}
        </Pressable>
      );
    },
    [selectedArtistId],
  );

  const snapPoints = React.useMemo(
    () => [isKeyboardVisible ? "92%" : screenHeight < 760 ? "88%" : "84%"],
    [isKeyboardVisible, screenHeight],
  );
  const listBottomPadding = insets.bottom + 14;

  const renderBackdrop = React.useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      onDismiss={onClose}
      enablePanDownToClose={false}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      enableDynamicSizing={false}
      handleComponent={null}
    >
      <View style={styles.sheetContent}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? "#F5F5F5" : "#FFFFFF",
            },
          ]}
        >
          <SheetHeader
            title="Signature"
            onClose={onClose}
            onConfirm={handleApply}
          />
          <View style={styles.tabsRow}>
            {/* Artist */}
            <Pressable
              onPress={() => setTab("artist")}
              style={styles.tabButton}
            >
              {tab === "artist" ? (
                <LinearGradient
                  colors={theme.drawingButton as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tabButtonActive}
                >
                  <Text style={[styles.tabLabel, styles.tabLabelActive]}>
                    Artist
                  </Text>
                </LinearGradient>
              ) : (
                <View style={styles.tabButtonInactive}>
                  <Text style={[styles.tabLabel, styles.tabLabelInactive]}>
                    Artist
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Custom */}
            <Pressable
              onPress={() => setTab("custom")}
              style={styles.tabButton}
            >
              {tab === "custom" ? (
                <LinearGradient
                  colors={theme.drawingButton as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tabButtonActive}
                >
                  <Text style={[styles.tabLabel, styles.tabLabelActive]}>
                    Custom
                  </Text>
                </LinearGradient>
              ) : (
                <View style={styles.tabButtonInactive}>
                  <Text style={[styles.tabLabel, styles.tabLabelInactive]}>
                    Custom
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Text */}
            <Pressable onPress={() => setTab("text")} style={styles.tabButton}>
              {tab === "text" ? (
                <LinearGradient
                  colors={theme.drawingButton as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tabButtonActive}
                >
                  <Text style={[styles.tabLabel, styles.tabLabelActive]}>
                    Text
                  </Text>
                </LinearGradient>
              ) : (
                <View style={styles.tabButtonInactive}>
                  <Text style={[styles.tabLabel, styles.tabLabelInactive]}>
                    Text
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          <View style={[styles.contentArea, { flex: 1, minHeight: 0 }]}>
            <View
              style={{
                position: "absolute",
                left: -5000,
                top: -5000,
                opacity: 0,
              }}
              pointerEvents="none"
            >
              <View
                ref={customTextCaptureRef}
                collapsable={false}
                style={[styles.captureTextCanvas, { width: captureTextWidth }]}
              >
                <Text
                  style={[
                    styles.captureText,
                    {
                      fontFamily: selectedCustomFont.fontFamily,
                      width: captureTextWidth - 128,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {customPreviewName}
                </Text>
              </View>

              <View
                ref={textSvgRef}
                collapsable={false}
                style={[styles.captureTextCanvas, { width: captureTextWidth }]}
              >
                <Text
                  style={[
                    styles.captureText,
                    {
                      fontFamily: selectedOutlineFont.fontFamily,
                      width: captureTextWidth - 128,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {customPreviewName}
                </Text>
              </View>
            </View>

            {tab === "custom" ? (
              <View style={styles.customWrap}>
                <View
                  style={[styles.inputWrap, { backgroundColor: "#EAEAEA" }]}
                >
                  <BottomSheetTextInput
                    value={typedName}
                    onChangeText={setTypedName}
                    placeholder={defaultName}
                    placeholderTextColor={isDark ? "#B8B8B8" : "#8F8F8F"}
                    style={[styles.input, { color: "#000" }]}
                  />
                </View>

                <BottomSheetFlatList
                  data={SIGNATURE_FONT_PRESETS}
                  keyExtractor={(item: any) => item.id}
                  renderItem={renderCustomFont}
                  style={{ flex: 1 }}
                  contentContainerStyle={[
                    styles.signatureList,
                    { paddingBottom: listBottomPadding },
                  ]}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  nestedScrollEnabled
                  initialNumToRender={10}
                />
              </View>
            ) : tab === "artist" ? (
              <View style={styles.artistWrap}>
                <BottomSheetFlatList
                  data={ARTIST_SIGNATURE_PRESETS}
                  keyExtractor={(item: any) => item.id}
                  renderItem={renderArtistItem}
                  numColumns={2}
                  columnWrapperStyle={styles.artistRow}
                  style={{ flex: 1 }}
                  contentContainerStyle={[
                    styles.artistList,
                    { paddingBottom: listBottomPadding },
                  ]}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  initialNumToRender={12}
                />
              </View>
            ) : (
              <View style={styles.textWrap}>
                <View
                  style={[styles.inputWrap, { backgroundColor: "#EAEAEA" }]}
                >
                  <BottomSheetTextInput
                    value={typedName}
                    onChangeText={setTypedName}
                    placeholder={defaultName}
                    placeholderTextColor={isDark ? "#B8B8B8" : "#8F8F8F"}
                    style={[styles.input, { color: "#000" }]}
                  />
                </View>

                <View style={styles.outlineFontWrap}>
                  <BottomSheetFlatList
                    data={SIGNATURE_OUTLINE_FONT_PRESETS}
                    keyExtractor={(item: any) => item.id}
                    numColumns={2}
                    showsVerticalScrollIndicator={false}
                    columnWrapperStyle={styles.artistRow}
                    style={{ flex: 1 }}
                    renderItem={({ item }: any) => {
                      const selected = selectedOutlineFontId === item.id;
                      return (
                        <Pressable
                          onPress={() => setSelectedOutlineFontId(item.id)}
                          style={[
                            styles.textPresetTile,
                            {
                              borderColor: selected
                                ? "#1D1D1D"
                                : "rgba(20,20,20,0.06)",
                              backgroundColor: "#F2F2F2",
                            },
                          ]}
                        >
                          <View style={styles.textSignaturePreviewBox}>
                            <Text
                              style={[
                                styles.outlineFontTileText,
                                {
                                  fontFamily: item.fontFamily,
                                  fontSize: textPreviewFontSize,
                                },
                                selected && { color: "#1D1D1D" },
                              ]}
                              adjustsFontSizeToFit
                              minimumFontScale={0.18}
                              numberOfLines={1}
                            >
                              {customPreviewName}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    }}
                    contentContainerStyle={[
                      styles.outlineFontList,
                      { paddingBottom: listBottomPadding },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </BottomSheetModal>
  );
};

export const SignatureModal = React.memo(SignatureModalComponent);

const styles = StyleSheet.create({
  sheetContent: {
    flex: 1,
  },
  card: {
    width: "100%",
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 4,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 12,
  },
  contentArea: {
    flex: 1,
    flexGrow: 1,
    minHeight: 0,
    marginTop: 16,
  },
  tabButton: {
    width: "32%",
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
  },
  tabButtonActive: {
    flex: 1,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  tabButtonInactive: {
    flex: 1,
    borderRadius: 26,
    backgroundColor: "#E8E8E8",
    justifyContent: "center",
    alignItems: "center",
  },
  tabLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    lineHeight: 18,
  },
  tabLabelActive: {
    color: "#FFFFFF",
  },
  tabLabelInactive: {
    color: "#A5A5A5",
  },
  customWrap: {
    flex: 1,
    minHeight: 0,
    gap: 10,
  },
  inputWrap: {
    borderRadius: 23,
    paddingHorizontal: 22,
    height: 50,
    justifyContent: "center",
  },
  input: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    paddingVertical: 0,
  },
  signatureList: {
    gap: 8,
    paddingTop: 2,
    paddingBottom: 10,
  },
  artistWrap: {
    flex: 1,
    minHeight: 0,
  },
  customSignatureRow: {
    minHeight: 76,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
    overflow: "visible",
  },
  signatureRowSelected: {
    backgroundColor: "rgba(29,29,29,0.06)",
    borderColor: "#1D1D1D",
  },
  signatureRowFaded: {
    opacity: 0.75,
  },
  customSignatureText: {
    fontSize: 30,
    lineHeight: 36,
    textAlign: "center",
    includeFontPadding: false,
    width: "100%",
  },
  artistList: {
    paddingBottom: 10,
  },
  artistRow: {
    justifyContent: "space-between",
    marginBottom: 8,
  },
  artistTile: {
    width: "48.4%",
    height: 88,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  textPresetTile: {
    width: "48.4%",
    minHeight: 78,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  textWrap: {
    flex: 1,
    minHeight: 0,
    gap: 20,
  },
  textPreviewRegion: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  captureTextCanvas: {
    alignSelf: "flex-start",
    paddingHorizontal: 64,
    paddingVertical: 32,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  captureText: {
    color: "#000000",
    fontSize: 150,
    lineHeight: 188,
    includeFontPadding: false,
    flexShrink: 0,
    textAlign: "center",
  },
  outlineFontWrap: {
    flex: 1,
    minHeight: 0,
  },
  outlineFontList: {
    paddingBottom: 20,
  },
  outlineFontTileText: {
    fontSize: 28,
    lineHeight: 34,
    color: "#000",
    textAlign: "center",
    includeFontPadding: false,
  },
  customSignaturePreviewBox: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    minHeight: 44,
    paddingHorizontal: 4,
  },
  textSignaturePreviewBox: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    minHeight: 34,
  },
});
