import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

interface CameraPermissionViewProps {
  canAskAgain: boolean;
  onRequestPermission: () => void;
  title?: string;
  subtitle?: string;
}

export const CameraPermissionView: React.FC<CameraPermissionViewProps> = ({
  canAskAgain,
  onRequestPermission,
  title = "Enable Camera Access",
  subtitle = "Camera is required to trace, preview, and capture your drawing.",
}) => {
  const { theme } = useTheme();

  const handlePrimaryAction = () => {
    if (canAskAgain) {
      onRequestPermission();
      return;
    }
    void Linking.openSettings();
  };

  return (
    <View style={[styles.permissionScreen, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.permissionCard,
          {
            backgroundColor: theme.cardBackground,
          },
        ]}
      >
        <LinearGradient
          colors={theme.drawingButton as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.permissionIconWrap}
        >
          <Ionicons name="camera-outline" size={30} color="#fff" />
        </LinearGradient>

        <Text style={[styles.permissionTitle, { color: theme.textPrimary }]}>
          {title}
        </Text>
        <Text
          style={[
            styles.permissionSubtitle,
            { color: theme.textSecondary },
          ]}
        >
          {subtitle}
        </Text>

        <Pressable onPress={handlePrimaryAction} style={styles.permissionPrimaryButton}>
          <LinearGradient
            colors={theme.drawingButton as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.permissionPrimaryButtonGradient}
          >
            <Text style={styles.permissionPrimaryButtonText}>
              {canAskAgain ? "Allow Camera" : "Open Settings"}
            </Text>
          </LinearGradient>
        </Pressable>

        {!canAskAgain && (
          <Pressable onPress={onRequestPermission} style={styles.permissionSecondaryButton}>
            <Text
              style={[
                styles.permissionSecondaryButtonText,
                { color: theme.textPrimary },
              ]}
            >
              Try Again
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  permissionScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  permissionCard: {
    width: "100%",
    maxWidth: 390,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: "center",
  },
  permissionIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  permissionTitle: {
    fontSize: 24,
    fontFamily: FontFamily.bold,
    textAlign: "center",
  },
  permissionSubtitle: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
    fontFamily: FontFamily.medium,
    lineHeight: 21,
    maxWidth: 320,
  },
  permissionPrimaryButton: {
    width: "100%",
    marginTop: 20,
    borderRadius: 999,
    overflow: "hidden",
  },
  permissionPrimaryButtonGradient: {
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  permissionPrimaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: FontFamily.semibold,
  },
  permissionSecondaryButton: {
    width: "100%",
    marginTop: 10,
    minHeight: 46,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  permissionSecondaryButtonText: {
    fontSize: 14,
    fontFamily: FontFamily.semibold,
  },
});
