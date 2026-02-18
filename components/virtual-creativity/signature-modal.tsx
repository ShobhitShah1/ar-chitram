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
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SignatureTab = "custom" | "artist";

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
              { color: theme.textPrimary, fontFamily: item.fontFamily },
              item.id === SIGNATURE_FONT_PRESETS[0].id &&
                styles.signatureTopText,
            ]}
          >
            {customPreviewName}
          </Text>
        </Pressable>
      );
    },
    [customPreviewName, selectedCustomFontId, theme.textPrimary],
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
              borderColor: selected
                ? theme.textPrimary
                : isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(20,20,20,0.06)",
              backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F2F2F2",
            },
          ]}
        >
          <Text
            style={[
              styles.artistName,
              { fontFamily: item.fontFamily, color: theme.textPrimary },
            ]}
          >
            {item.name}
          </Text>
        </Pressable>
      );
    },
    [isDark, selectedArtistId, theme.textPrimary],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.modalBackground,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          <SheetHeader
            title="Signature"
            onClose={onClose}
            onConfirm={handleApply}
          />

          <View style={[styles.tabsRow]}>
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

          {tab === "custom" ? (
            <View style={styles.customWrap}>
              <View
                style={[
                  styles.inputWrap,
                  { backgroundColor: isDark ? "#EAEAEA" : "#EAEAEA" },
                ]}
              >
                <TextInput
                  value={typedName}
                  onChangeText={setTypedName}
                  placeholder="Type Here..."
                  placeholderTextColor={isDark ? "#B8B8B8" : "#8F8F8F"}
                  style={[styles.input, { color: theme.textPrimary }]}
                />
              </View>

              <FlatList
                data={SIGNATURE_FONT_PRESETS}
                keyExtractor={(item) => item.id}
                renderItem={renderCustomFont}
                contentContainerStyle={styles.signatureList}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews
                keyboardShouldPersistTaps="handled"
                initialNumToRender={4}
              />
            </View>
          ) : (
            <View>
              <FlatList
                data={ARTIST_SIGNATURE_PRESETS}
                keyExtractor={(item) => item.id}
                renderItem={renderArtistItem}
                numColumns={2}
                columnWrapperStyle={styles.artistRow}
                contentContainerStyle={styles.artistList}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews
                initialNumToRender={8}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export const SignatureModal = React.memo(SignatureModalComponent);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
    justifyContent: "flex-end",
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 4,
    paddingHorizontal: 16,
    maxHeight: "80%",
  },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 12,
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
    paddingBottom: 6,
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
  signatureTopText: {
    fontFamily: FontFamily.bold,
    fontSize: 36,
    lineHeight: 40,
  },
  artistList: {
    paddingBottom: 8,
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
