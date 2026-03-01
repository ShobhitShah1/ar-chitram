import {
  ARTIST_SIGNATURE_PRESETS,
  SIGNATURE_FONT_PRESETS,
} from "@/components/virtual-creativity/editor-presets";
import type { SignatureSelection } from "@/components/virtual-creativity/editor-presets";
import { SheetHeader } from "@/components/virtual-creativity/sheet-header";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Modal from "react-native-modal";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SignatureTab = "custom" | "artist";
const SHEET_MAX_HEIGHT = Dimensions.get("window").height * 0.86;
const SHEET_MIN_HEIGHT = 420;

interface SignatureModalProps {
  visible: boolean;
  selectedSignatureId?: string | null;
  defaultName?: string;
  onClose: () => void;
  onApply: (selection: SignatureSelection) => void;
}

const SignatureModalComponent: React.FC<SignatureModalProps> = ({
  visible,
  selectedSignatureId,
  defaultName = "AK jackson",
  onClose,
  onApply,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = React.useState<SignatureTab>("custom");
  const [typedName, setTypedName] = React.useState(defaultName);
  const [selectedCustomFontId, setSelectedCustomFontId] = React.useState(
    SIGNATURE_FONT_PRESETS[0].id,
  );
  const [selectedArtistId, setSelectedArtistId] = React.useState(
    ARTIST_SIGNATURE_PRESETS[0].id,
  );

  React.useEffect(() => {
    if (!visible) return;
    if (selectedSignatureId?.startsWith("artist-")) {
      setTab("artist");
      setSelectedArtistId(selectedSignatureId);
      return;
    }
    setTab("custom");
    setSelectedCustomFontId(
      selectedSignatureId ?? SIGNATURE_FONT_PRESETS[0].id,
    );
  }, [selectedSignatureId, visible]);

  const handleApply = React.useCallback(() => {
    if (tab === "artist") {
      const selectedArtist =
        ARTIST_SIGNATURE_PRESETS.find((item) => item.id === selectedArtistId) ??
        ARTIST_SIGNATURE_PRESETS[0];
      onApply({
        id: selectedArtist.id,
        value: selectedArtist.name,
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
  ]);

  const customPreviewName = typedName.trim() || defaultName;

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
              { color: "#000", fontFamily: item.fontFamily },
            ]}
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
          <Text
            style={[
              styles.artistName,
              { fontFamily: item.fontFamily, color: "#000" },
            ]}
          >
            {item.name}
          </Text>
        </Pressable>
      );
    },
    [selectedArtistId],
  );

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
      backdropColor="#000"
      backdropOpacity={isDark ? 0.2 : 0.18}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropTransitionOutTiming={0}
      avoidKeyboard
      useNativeDriver
    >
      <KeyboardAvoidingView
        behavior="padding"
        enabled={visible}
        style={styles.keyboardWrap}
      >
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
          </View>

          <View style={styles.contentArea}>
            {tab === "custom" ? (
              <View style={styles.customWrap}>
                <View
                  style={[styles.inputWrap, { backgroundColor: "#EAEAEA" }]}
                >
                  <TextInput
                    value={typedName}
                    onChangeText={setTypedName}
                    placeholder="Type Here..."
                    placeholderTextColor={isDark ? "#B8B8B8" : "#8F8F8F"}
                    style={[styles.input, { color: "#000" }]}
                  />
                </View>

                <FlatList
                  data={SIGNATURE_FONT_PRESETS}
                  keyExtractor={(item) => item.id}
                  renderItem={renderCustomFont}
                  style={styles.list}
                  contentContainerStyle={styles.signatureList}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  nestedScrollEnabled
                  initialNumToRender={4}
                />
              </View>
            ) : (
              <View style={styles.artistWrap}>
                <FlatList
                  data={ARTIST_SIGNATURE_PRESETS}
                  keyExtractor={(item) => item.id}
                  renderItem={renderArtistItem}
                  numColumns={2}
                  style={styles.list}
                  columnWrapperStyle={styles.artistRow}
                  contentContainerStyle={styles.artistList}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  initialNumToRender={8}
                />
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const SignatureModal = React.memo(SignatureModalComponent);

const styles = StyleSheet.create({
  modal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  keyboardWrap: {
    width: "100%",
    justifyContent: "flex-end",
  },
  card: {
    width: "100%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 4,
    paddingHorizontal: 16,
    minHeight: SHEET_MIN_HEIGHT,
    maxHeight: SHEET_MAX_HEIGHT,
  },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 12,
  },
  contentArea: {
    flex: 1,
    minHeight: 0,
  },
  tabButton: {
    width: "48.4%",
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
  list: {
    flex: 1,
    minHeight: 0,
  },
  artistWrap: {
    flex: 1,
    minHeight: 0,
  },
  signatureRow: {
    minHeight: 54,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  signatureRowSelected: {
    backgroundColor: "transparent",
  },
  signatureRowFaded: {
    opacity: 0.85,
  },
  signatureText: {
    fontSize: 34,
    lineHeight: 38,
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
    minHeight: 76,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    justifyContent: "center",
  },
  artistName: {
    fontSize: 30,
    lineHeight: 34,
    textAlign: "center",
  },
});
