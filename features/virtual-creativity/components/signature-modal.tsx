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
  BottomSheetView,
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
import { captureRef } from "react-native-view-shot";
import Svg, { Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SignatureTab = "artist" | "custom" | "text";
const SHEET_MIN_HEIGHT = 500;
const SHEET_CUSTOM_PREFERRED_HEIGHT = 800;
const SHEET_ARTIST_PREFERRED_HEIGHT = 840;

interface SignatureModalProps {
  visible: boolean;
  selectedSignatureId?: string | null;
  defaultName?: string;
  bottomInset?: number;
  onClose: () => void;
  onApply: (selection: SignatureSelection) => void;
}

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
  const [typedName, setTypedName] = React.useState(defaultName);
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
    setTypedName(defaultName);
  }, [selectedSignatureId, visible, defaultName]);

  const textSvgRef = React.useRef<View>(null);
  const [isCapturing, setIsCapturing] = React.useState(false);

  const customPreviewName = typedName.trim() || defaultName;

  const selectedOutlineFont = React.useMemo(
    () =>
      SIGNATURE_OUTLINE_FONT_PRESETS.find(
        (f) => f.id === selectedOutlineFontId,
      ) ?? SIGNATURE_OUTLINE_FONT_PRESETS[0],
    [selectedOutlineFontId],
  );

  const handleApply = React.useCallback(async () => {
    if (tab === "text") {
      if (!textSvgRef.current || isCapturing) return;
      setIsCapturing(true);
      try {
        const uri = await captureRef(textSvgRef.current, {
          format: "png",
          quality: 1,
        });
        onApply({
          id: "text-" + Date.now(),
          value: customPreviewName,
          fontFamily: selectedOutlineFont.fontFamily,
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
      });
      return;
    }

    const selectedFont =
      SIGNATURE_FONT_PRESETS.find((item) => item.id === selectedCustomFontId) ??
      SIGNATURE_FONT_PRESETS[0];
    const value = typedName.trim() || defaultName;
    onApply({
      id: selectedFont.id,
      value,
      fontFamily: selectedFont.fontFamily,
      isArtistPreset: false,
    });
  }, [
    defaultName,
    onApply,
    selectedArtistId,
    selectedCustomFontId,
    tab,
    typedName,
    isCapturing,
    customPreviewName,
    selectedOutlineFont.fontFamily,
  ]);

  const renderCustomFont = React.useCallback(
    ({ item }: { item: (typeof SIGNATURE_FONT_PRESETS)[number] }) => {
      const selected = item.id === selectedCustomFontId;
      return (
        <Pressable
          onPress={() => setSelectedCustomFontId(item.id)}
          style={[
            styles.signatureRow,
            selected ? styles.signatureRowSelected : styles.signatureRowFaded,
          ]}
        >
          <Text
            style={[
              styles.signatureText,
              { color: "#000", fontFamily: item.fontFamily, width: "100%" },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.1}
            selectable={false}
          >
            {customPreviewName}
          </Text>
        </Pressable>
      );
    },
    [customPreviewName, selectedCustomFontId],
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

  const sheetMaxHeight = Math.min(screenHeight, screenHeight * 0.97);

  const snapPoints = React.useMemo(() => ["80%"], []);
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
      enablePanDownToClose={true}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      enableDynamicSizing={false}
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
            {tab === "custom" ? (
              <View style={styles.customWrap}>
                <View
                  style={[styles.inputWrap, { backgroundColor: "#EAEAEA" }]}
                >
                  <BottomSheetTextInput
                    value={typedName}
                    onChangeText={setTypedName}
                    placeholder="Type here..."
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
                  style={[
                    styles.inputWrap,
                    { backgroundColor: isDark ? "#282828" : "#E8E8E8" },
                  ]}
                >
                  <BottomSheetTextInput
                    value={typedName}
                    onChangeText={setTypedName}
                    placeholder="Type here..."
                    placeholderTextColor={isDark ? "#B8B8B8" : "#8F8F8F"}
                    style={[styles.input, { color: "#000" }]}
                  />
                </View>

                {/* Hidden region for capturing text as image layer */}
                <View
                  style={{
                    position: "absolute",
                    left: -1000,
                    top: 0,
                    opacity: 0,
                  }}
                >
                  <View
                    ref={textSvgRef}
                    collapsable={false}
                    style={styles.svgHolder}
                  >
                    <Svg
                      width={Math.max(400, customPreviewName.length * 90)}
                      height={250}
                    >
                      <SvgText
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        alignmentBaseline="central"
                        fill="#000000"
                        fontSize="150"
                        fontFamily={selectedOutlineFont.fontFamily}
                      >
                        {customPreviewName}
                      </SvgText>
                    </Svg>
                  </View>
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
                            styles.artistTile,
                            {
                              borderColor: selected
                                ? "#1D1D1D"
                                : "rgba(20,20,20,0.06)",
                              backgroundColor: "#F2F2F2",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.outlineFontTileText,
                              {
                                fontFamily: item.fontFamily,
                                width: "100%",
                              },
                              selected && { color: "#1D1D1D" },
                            ]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.1}
                          >
                            {customPreviewName}
                          </Text>
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
  signatureRow: {
    minHeight: 54,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  signatureRowSelected: {
    backgroundColor: "rgba(29,29,29,0.06)",
    borderColor: "#1D1D1D",
  },
  signatureRowFaded: {
    opacity: 0.75,
  },
  signatureText: {
    fontSize: 34,
    lineHeight: 48,
    textAlign: "center",
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
    height: 70,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
  svgHolder: {
    paddingHorizontal: 10,
    paddingVertical: 10,
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
    color: "#000",
    textAlign: "center",
    width: "90%",
  },
});
