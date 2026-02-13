import { ic_download_image_bg } from "@/assets/icons";
import { ACCENT_COLOR } from "@/constants/colors";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { MaterialIcons } from "@expo/vector-icons";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Modal, Text } from "./themed";

export interface QualityOption {
  id: string;
  label: string;
  resolution: string;
  description: string;
  isPremium: boolean;
  size: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

interface QualitySelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectQuality: (quality: QualityOption) => Promise<void>;
}

const qualityOptions: QualityOption[] = [
  {
    id: "1080p",
    label: "1080 Full HD",
    resolution: "1080p",
    description: "Best quality",
    isPremium: false,
    size: "~4MB",
    icon: "hd",
  },
  {
    id: "720p",
    label: "720 HD",
    resolution: "720p",
    description: "High quality",
    isPremium: false,
    size: "~2MB",
    icon: "hd",
  },
  {
    id: "480p",
    label: "480 Medium",
    resolution: "480p",
    description: "Medium quality",
    isPremium: false,
    size: "~800KB",
    icon: "sd",
  },
];

export const QualitySelectionModal: React.FC<QualitySelectionModalProps> = ({
  visible,
  onClose,
  onSelectQuality,
}) => {
  const { theme, isDark } = useTheme();
  const [selectedQuality, setSelectedQuality] = useState<string>("720p");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    const quality = qualityOptions.find((q) => q.id === selectedQuality);
    if (!quality) return;

    try {
      setIsExporting(true);
      await onSelectQuality(quality);
      onClose();
    } catch (error) {
      Alert.alert("Export Failed", "Failed to export image. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          width: 30,
          height: 30,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: isDark ? "rgba(255, 251, 251, 0.12)" : "white",
          borderRadius: 500,
          elevation: 5,
          shadowColor: "black",
          shadowOffset: { width: 5, height: 5 },
          shadowOpacity: 0.5,
          // boxShadow: "0px 0px 0px 1px rgba(0,0,0,0.5)",
        }}
      >
        <Ionicons name="close-outline" size={22} color={theme.textPrimary} />
      </Pressable>
      <View
        style={{
          paddingHorizontal: 45,
          paddingVertical: 8,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Image
          source={ic_download_image_bg}
          style={{ width: 80, height: 80, marginBottom: 10 }}
        />

        <View style={styles.optionsContainer}>
          {qualityOptions.map((option) => (
            <Pressable
              key={option.id}
              style={styles.optionRow}
              onPress={() => setSelectedQuality(option.id)}
            >
              <View style={styles.radioContainer}>
                <View
                  style={[
                    styles.radioOuter,
                    selectedQuality === option.id && {
                      borderColor: isDark ? "#fff" : "#333",
                    },
                  ]}
                >
                  {selectedQuality === option.id && (
                    <View
                      style={[
                        styles.radioInner,
                        { backgroundColor: isDark ? "#fff" : "#333" },
                      ]}
                    />
                  )}
                </View>
              </View>
              <Text style={styles.optionText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[
            styles.exportButton,
            isExporting && styles.exportButtonDisabled,
          ]}
          onPress={handleExport}
          disabled={isExporting}
        >
          <Text style={styles.exportButtonText}>
            {isExporting ? "Exporting..." : "Export"}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    width: "100%",
    maxWidth: 300,
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: "#E3F2FD",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  optionsContainer: {
    width: "100%",
    marginBottom: 30,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    width: "100%",
  },
  radioContainer: {
    marginRight: 16,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  radioSelected: {
    borderColor: "#fff",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#333",
  },
  optionText: {
    fontSize: 18,
    fontFamily: FontFamily.medium,
  },
  exportButton: {
    backgroundColor: ACCENT_COLOR,
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: FontFamily.semibold,
  },
});
