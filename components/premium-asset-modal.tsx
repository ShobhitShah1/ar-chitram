import {
  ic_black_diamond,
  ic_close,
  ic_diamond,
  ic_play,
} from "@/assets/icons";
import { assets_bg } from "@/assets/images";
import { FontFamily } from "@/constants/fonts";
import { PremiumChoiceButton } from "@/components/premium-choice-button";
import { Image } from "expo-image";
import React, { memo, useCallback, useMemo } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import type { GridAssetItem } from "./image-grid";

interface PremiumAssetModalProps {
  asset: GridAssetItem | null;
  visible: boolean;
  onClose: () => void;
  onFreePress: (asset: GridAssetItem) => void;
  onPremiumPress?: (asset: GridAssetItem) => void;
  freeDisabled?: boolean;
  premiumDisabled?: boolean;
  premiumPriceLabel?: string;
}

export const PremiumAssetModal: React.FC<PremiumAssetModalProps> = memo(
  ({
    asset,
    visible,
    onClose,
    onFreePress,
    onPremiumPress,
    freeDisabled = false,
    premiumDisabled = false,
    premiumPriceLabel,
  }) => {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    const scaleX = Math.min((screenWidth - 30) / 384, 1);
    const scaleY = Math.min((screenHeight - 136) / 683, 0.92);
    const scale = Math.min(scaleX, scaleY);
    const cardWidth = Math.round(384 * scaleX);
    const cardHeight = Math.round(675 * scaleY);
    const previewWidth = Math.round(320 * scaleX);
    const previewHeight = Math.round(320 * scaleY);
    const buttonWidth = Math.round(320 * scaleX);

    const layout = useMemo(
      () => ({
        borderRadius: Math.round(30 * scale),
        heroSize: Math.round(90 * scale),
        heroTop: Math.round(-35 * scaleY),
        heroLeft: Math.round(-15 * scaleX),
        closeSize: Math.round(30 * scale),
        closeTop: Math.round(16 * scaleY),
        closeRight: Math.round(14 * scaleX),
        closeIconSize: Math.max(10, Math.round(10 * scale)),
        titleTop: Math.round(26 * scaleY),
        titlePaddingLeft: Math.round(22 * scaleX),
        titlePaddingRight: Math.round(56 * scaleX),
        titleFontSize: Math.max(35, Math.round(45 * scale)),
        titleLineHeight: Math.max(36, Math.round(46 * scale)),
        previewTop: Math.round(140 * scaleY),
        previewLeft: Math.round((cardWidth - previewWidth) / 2),
        actionsBottom: Math.round(30 * scaleY),
        actionsLeft: Math.round((cardWidth - buttonWidth) / 2),
        actionGap: Math.round(12 * scaleY),
        actionHeight: Math.round(46 * scaleY),
      }),
      [buttonWidth, cardWidth, previewWidth, scale, scaleX, scaleY],
    );

    const handleFreePress = useCallback(() => {
      if (!asset) {
        return;
      }

      onFreePress(asset);
    }, [asset, onFreePress]);

    const handlePremiumPress = useCallback(() => {
      if (!asset) {
        return;
      }

      (onPremiumPress ?? onFreePress)(asset);
    }, [asset, onFreePress, onPremiumPress]);

    const cardStyle = useMemo(
      () => [
        styles.card,
        {
          width: cardWidth,
          height: cardHeight,
          borderRadius: layout.borderRadius,
        },
      ],
      [cardHeight, cardWidth, layout.borderRadius],
    );

    if (!asset) {
      return null;
    }

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

          <View style={cardStyle}>
            <Image
              source={ic_diamond}
              style={[
                styles.heroBadge,
                {
                  width: layout.heroSize,
                  height: layout.heroSize,
                  top: layout.heroTop,
                  left: layout.heroLeft,
                },
              ]}
              contentFit="contain"
            />

            <View
              style={[
                styles.cardSurface,
                { borderRadius: layout.borderRadius },
              ]}
            >
              <Image
                source={assets_bg}
                style={styles.cardBackgroundImage}
                contentFit="cover"
                transition={0}
              />

              <View style={styles.cardContent}>
                <Pressable
                  onPress={onClose}
                  style={[
                    styles.closeButton,
                    {
                      top: layout.closeTop,
                      right: layout.closeRight,
                      width: layout.closeSize,
                      height: layout.closeSize,
                    },
                  ]}
                >
                  <Image
                    source={ic_close}
                    style={[
                      styles.closeIcon,
                      {
                        width: layout.closeIconSize,
                        height: layout.closeIconSize,
                      },
                    ]}
                    contentFit="contain"
                  />
                </Pressable>

                <View
                  style={[
                    styles.titleWrap,
                    {
                      top: layout.titleTop,
                      paddingLeft: layout.titlePaddingLeft,
                      paddingRight: layout.titlePaddingRight,
                    },
                  ]}
                >
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.65}
                    numberOfLines={1}
                    style={[
                      styles.title,
                      {
                        fontSize: layout.titleFontSize,
                        lineHeight: layout.titleLineHeight,
                      },
                    ]}
                  >
                    AR Chitram
                  </Text>
                </View>

                <View
                  style={[
                    styles.previewWrap,
                    {
                      top: layout.previewTop,
                      left: layout.previewLeft,
                      width: previewWidth,
                      height: previewHeight,
                    },
                  ]}
                >
                  <Image
                    source={
                      typeof asset.image === "string"
                        ? { uri: asset.image }
                        : asset.image
                    }
                    style={styles.previewImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                </View>

                <View
                  style={[
                    styles.actions,
                    {
                      left: layout.actionsLeft,
                      bottom: layout.actionsBottom,
                      width: buttonWidth,
                      gap: layout.actionGap,
                    },
                  ]}
                >
                  <PremiumChoiceButton
                    style={{ height: layout.actionHeight }}
                    disabled={freeDisabled}
                    iconSource={ic_play}
                    label="FREE"
                    detail="One time use"
                    pillLabel="AD"
                    colors={["#1DDFD7", "#1539FF", "#F006FF"]}
                    labelColor="#F9F9F9"
                    accentTextColor="#F9F9F9"
                    pillBackgroundColor="rgba(5, 5, 5, 0.55)"
                    pillTextColor="#F9F9F9"
                    onPress={handleFreePress}
                  />
                  <PremiumChoiceButton
                    style={{ height: layout.actionHeight }}
                    disabled={premiumDisabled}
                    iconSource={ic_black_diamond}
                    label="PRIMIUM"
                    detail="Lifetime use"
                    pillLabel={premiumPriceLabel ?? ""}
                    colors={["#E7B901", "#F2D501", "#EC7303"]}
                    labelColor="#361D01"
                    accentTextColor="#050505"
                    pillBackgroundColor="rgba(74, 40, 3, 0.88)"
                    pillTextColor="#F9F9F9"
                    onPress={handlePremiumPress}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  },
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(47, 45, 45, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 13,
  },
  card: {
    borderRadius: 30,
    overflow: "visible",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 14,
  },
  cardSurface: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  cardBackgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    flex: 1,
    position: "relative",
  },
  heroBadge: {
    position: "absolute",
    top: -22,
    left: -12,
    width: 72,
    height: 72,
    zIndex: 4,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 500,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  closeIcon: {
    width: 10,
    height: 10,
    tintColor: "#050505",
  },
  titleWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#050505",
    fontFamily: FontFamily.pattaya,
    lineHeight: 44,
    left: 18,
    textAlign: "center",
    includeFontPadding: false,
    width: "100%",
  },
  previewWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    width: "115%",
    height: "115%",
    alignSelf: "center",
  },
  actions: {
    position: "absolute",
  },
});
