import {
  ic_close,
  ic_confetti_left,
  ic_confetti_right,
  ic_gold,
} from "@/assets/icons";
import { Images } from "@/assets/images";
import { FontFamily } from "@/constants/fonts";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Modal, StyleSheet, View } from "react-native";
import { Pressable, Text } from "./themed";

interface WinnerModalProps {
  visible: boolean;
  onClose: () => void;
  userImage?: string;
  backgroundImage?: string;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  visible,
  onClose,
  userImage,
  backgroundImage,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      style={styles.modalContainer}
      presentationStyle="overFullScreen"
      backdropColor={"rgba(0,0,0,0.2)"}
    >
      <View style={styles.modalContainer}>
        <View style={styles.contentContainer}>
          <Pressable style={styles.closeView} onPress={onClose}>
            <Image source={ic_close} style={styles.closeIcon} />
          </Pressable>

          <View style={styles.overlay}>
            <Image
              source={
                backgroundImage
                  ? { uri: backgroundImage }
                  : Images.winnerBackground
              }
              style={styles.imageStyle}
            />
            <LinearGradient
              colors={[
                "rgba(6, 6, 6, 0)",
                "rgba(6, 6, 6, 0)",
                "rgba(6, 6, 6, 0.9)",
                "rgba(6, 6, 6, 1)",
              ]}
              style={{
                position: "absolute",
                bottom: 0,
                height: "70%",
                width: "100%",
              }}
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignSelf: "center",
                alignItems: "center",
                position: "absolute",
                bottom: 48,
              }}
            >
              <View style={{ width: "30%", height: 150, left: 10 }}>
                <Image
                  source={ic_confetti_left}
                  contentFit="cover"
                  style={{ width: "120%", height: "120%" }}
                />
              </View>

              <View
                style={{
                  width: "40%",
                  height: 150,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {userImage && (
                  <Image
                    source={{ uri: userImage }}
                    style={styles.winnerImage}
                    contentFit="cover"
                  />
                )}
                <Image
                  source={ic_gold}
                  style={{ width: "120%", height: "130%" }}
                />
              </View>
              <View style={{ width: "30%", height: 150, right: 30 }}>
                <Image
                  source={ic_confetti_right}
                  contentFit="cover"
                  style={{ width: "120%", height: "120%" }}
                />
              </View>
            </View>
            <View
              style={{
                position: "absolute",
                bottom: 6.5,
                width: "100%",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: FontFamily.medium,
                  color: "white",
                }}
              >
                Champion of the Perfect Edit
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  winnerImage: {
    width: 95,
    height: 95,
    zIndex: 0,
    bottom: 15,
    left: 22,
    position: "absolute",
    justifyContent: "center",
    alignSelf: "center",
    borderRadius: 500,
  },
  overlay: {
    width: "100%",
    height: "100%",
    flex: 1,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "white",
  },
  contentContainer: {
    width: "85%",
    height: "70%",
  },
  imageStyle: {
    width: "100%",
    height: "100%",
  },
  modalContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  closeView: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 9999,
    width: 30,
    height: 30,
    borderRadius: 5000,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  closeIcon: {
    width: 12,
    height: 12,
  },
});
