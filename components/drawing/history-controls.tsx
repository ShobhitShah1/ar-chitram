import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "../themed";
import { Image } from "expo-image";
import { ic_redo } from "@/assets/icons";
import { FontFamily } from "@/constants/fonts";

interface HistoryControlsProps {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  undoCount?: number;
  redoCount?: number;
}

const HistoryControls: React.FC<HistoryControlsProps> = ({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  undoCount = 0,
  redoCount = 0,
}) => {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={onUndo}
        disabled={!canUndo}
        style={[styles.button, styles.leftButton, !canUndo && styles.disabled]}
      >
        <Image
          source={ic_redo}
          style={[styles.iconStyle, { transform: [{ scaleX: 1 }] }]}
          contentFit="contain"
        />
        {undoCount > -1 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{undoCount}</Text>
          </View>
        )}
      </Pressable>

      <Pressable
        onPress={onRedo}
        disabled={!canRedo}
        style={[styles.button, styles.rightButton, !canRedo && styles.disabled]}
      >
        <Image
          source={ic_redo}
          style={[styles.iconStyle, { transform: [{ scaleX: -1 }] }]}
          contentFit="contain"
        />
        {redoCount > -1 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{redoCount}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
};

export default HistoryControls;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2, // Space between the two halves
  },
  button: {
    backgroundColor: "rgba(5,5,5,0.5)",
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 55,
  },
  leftButton: {
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 30,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  rightButton: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,
  },
  disabled: {
    opacity: 0.5,
  },
  badge: {
    position: "absolute",
    top: -17,
    alignSelf: "center",
    backgroundColor: "#2A5FFF",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    zIndex: 10,
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontFamily: FontFamily.semibold,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
});
