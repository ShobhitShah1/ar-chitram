import { TEXT_PRIMARY, TEXT_SECONDARY } from "@/constants/colors";
import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
} from "react-native";
import { View } from "./themed";

interface CommonHeaderProps {
  phoneNumber: string;
  onPhoneNumberChange: (text: string) => void;
  editable?: boolean;
  onSubmit?: () => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  placeholder?: string;
}

export default function CommonHeader({
  phoneNumber,
  onPhoneNumberChange,
  editable = true,
  onSubmit,
  isLoading = false,
  onRefresh,
  placeholder = "Enter your phone number",
}: CommonHeaderProps) {
  const { theme, isDark } = useTheme();

  return (
    <>
      {/* Header with refresh icon in circle - centered */}
      <View style={[styles.header, {}]}>
        <Pressable
          style={[styles.refreshIconCircle, { borderColor: theme.textPrimary }]}
          onPress={onRefresh}
          disabled={!onRefresh || isLoading}
        >
          <Ionicons name="refresh" size={20} color={theme.textPrimary} />
        </Pressable>
      </View>

      {/* Phone input section */}
      <View style={styles.searchSection}>
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: theme.cardBackground },
          ]}
        >
          <TextInput
            style={[styles.textInput, { color: theme.textPrimary }]}
            placeholder={placeholder}
            placeholderTextColor={TEXT_SECONDARY}
            value={phoneNumber}
            onChangeText={onPhoneNumberChange}
            keyboardType="phone-pad"
            editable={editable && !isLoading}
            returnKeyType="search"
            onSubmitEditing={onSubmit}
          />
          <Pressable
            onPress={onSubmit}
            disabled={isLoading}
            style={{
              padding: 8,
              borderRadius: 500,
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(229, 229, 229, 1)",
            }}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.textPrimary} size="small" />
            ) : (
              <Ionicons name="search" size={20} color={theme.textPrimary} />
            )}
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  refreshIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: TEXT_SECONDARY,
    alignItems: "center",
    justifyContent: "center",
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 5,
    elevation: 3,
    shadowColor: "#585858",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 50,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: TEXT_PRIMARY,
    fontFamily: FontFamily.medium,
  },
});
