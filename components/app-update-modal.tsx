import React from "react";
import { Modal, StyleSheet, Text, View } from "react-native";

import PrimaryButton from "@/components/ui/primary-button";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";

interface AppUpdateModalProps {
  visible: boolean;
  latestVersion?: string;
  isUpdating?: boolean;
  onUpdatePress: () => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  visible,
  latestVersion,
  isUpdating = false,
  onUpdatePress,
}) => {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={() => {}}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.modalBackground,
              borderColor: theme.modalBorder,
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Update Required
          </Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            A new update is ready. Please install it now to continue with the
            latest improvements.
          </Text>

          {latestVersion ? (
            <Text style={[styles.versionText, { color: theme.textPrimary }]}>
              Latest version: {latestVersion}
            </Text>
          ) : null}

          <PrimaryButton
            title={isUpdating ? "Updating..." : "Update Now"}
            onPress={onUpdatePress}
            style={styles.button}
            colors={theme.drawingButton as any}
            textStyle={{ color: "#FFFFFF", fontSize: 14 }}
            disabled={isUpdating}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  card: {
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 18,
    borderWidth: 1,
  },
  title: {
    fontFamily: FontFamily.semibold,
    fontSize: 20,
    textAlign: "center",
    marginBottom: 10,
  },
  message: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  versionText: {
    marginVertical: 10,
    textAlign: "center",
    fontFamily: FontFamily.medium,
    fontSize: 12,
  },
  button: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    marginTop: 4,
  },
});
