import { GLOBAL_PREMIUM_UNLOCK_SKU } from "@/constants/subscription-config";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Dimensions,
  Pressable,
} from "react-native";
import { Image, ImageBackground } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ic_close, ic_glow_star, ic_diamond } from "@/assets/icons";
import {
  ic_pro_image,
  ic_pro_modal_background,
  ic_pro_title_glow,
} from "@/assets/images";
import { FontFamily } from "@/constants/fonts";
import { useGigglamIAPContext } from "@/context/iap-context";
import { logPremiumClicked } from "@/services/analytics-service";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    getProduct,
    isPurchased,
    purchaseProduct,
    ensureProductLoaded,
    isPurchasing,
  } = useGigglamIAPContext();
  const [isProductLoading, setIsProductLoading] = React.useState(false);

  // Responsive sizing
  const cardWidth = Math.min(screenWidth * 0.9, 380);
  const cardHeight = Math.min(screenHeight * 0.75, 660);

  const features = ["Premium accessible", "Onetime purchase", "No Ads"];
  const subscriptionProduct = getProduct(GLOBAL_PREMIUM_UNLOCK_SKU);
  const dynamicPrice = subscriptionProduct?.price;
  const isUnlocked = isPurchased(GLOBAL_PREMIUM_UNLOCK_SKU);

  React.useEffect(() => {
    if (!visible) {
      return;
    }

    let cancelled = false;
    setIsProductLoading(true);

    void ensureProductLoaded(GLOBAL_PREMIUM_UNLOCK_SKU).finally(() => {
      if (!cancelled) {
        setIsProductLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [ensureProductLoaded, visible]);

  const handleSubscribe = React.useCallback(async () => {
    if (isUnlocked || isPurchasing) {
      onClose();
      return;
    }

    if (!subscriptionProduct) {
      return;
    }

    logPremiumClicked("subscription_modal_purchase_tap");
    const didPurchase = await purchaseProduct(GLOBAL_PREMIUM_UNLOCK_SKU);
    if (didPurchase) {
      onClose();
    }
  }, [isPurchasing, isUnlocked, onClose, purchaseProduct, subscriptionProduct]);

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

        <View style={[styles.card, { width: cardWidth, height: cardHeight }]}>
          {/* Diamond Badge */}
          <Image
            source={ic_diamond}
            style={styles.heroBadge}
            contentFit="contain"
          />

          <View style={styles.cardSurface}>
            <ImageBackground
              source={ic_pro_modal_background}
              style={styles.background}
              contentFit="cover"
            >
              <View style={styles.content}>
                {/* Close Button */}
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Image
                    source={ic_close}
                    style={styles.closeIcon}
                    contentFit="contain"
                  />
                </TouchableOpacity>

                {/* Title (No Glow) */}
                <Text style={styles.title}>AR Chitram</Text>

                {/* Main Visual */}
                <View style={styles.imageContainer}>
                  <Image
                    source={ic_pro_image}
                    style={styles.girlImage}
                    contentFit="contain"
                  />
                </View>

                {/* Premium Member Banner with Glow Background */}
                <View style={styles.premiumBanner}>
                  <Image
                    source={ic_pro_title_glow}
                    style={styles.premiumGlow}
                    contentFit="contain"
                  />
                  <Image source={ic_glow_star} style={styles.starIcon} />
                  <Text style={styles.premiumText}>Premium Member</Text>
                  <Image source={ic_glow_star} style={styles.starIcon} />
                </View>

                {/* Features List */}
                <View style={styles.featuresList}>
                  {features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Ionicons
                        name="checkmark"
                        size={22}
                        color="#FFB800"
                        style={styles.checkIcon}
                      />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                {/* Subscribe Button with Gradient Border */}
                <Pressable
                  onPress={handleSubscribe}
                  disabled={
                    isPurchasing || (!isUnlocked && !subscriptionProduct)
                  }
                  style={styles.subscribeButton}
                >
                  <LinearGradient
                    colors={["#C8A105", "#FFCD07"]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.gradientBorder}
                  >
                    <LinearGradient
                      colors={["#E7B901", "#F2D501", "#F2D501", "#EC7303"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.buttonInner}
                    >
                      <View />
                      <Text style={styles.buttonLabel}>
                        {isUnlocked ? "Unlocked" : "Subscription"}
                      </Text>
                      {isProductLoading && !dynamicPrice ? (
                        <ActivityIndicator size="small" color="#000000" />
                      ) : dynamicPrice ? (
                        <Text style={styles.buttonPrice}>{dynamicPrice}</Text>
                      ) : (
                        <View />
                      )}
                    </LinearGradient>
                  </LinearGradient>
                </Pressable>
              </View>
            </ImageBackground>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default SubscriptionModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    overflow: "visible",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 20,
  },
  cardSurface: {
    flex: 1,
    borderRadius: 36,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  heroBadge: {
    position: "absolute",
    top: -25,
    left: -15,
    width: 85,
    height: 85,
    zIndex: 10,
  },
  background: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  closeIcon: {
    width: 12,
    height: 12,
    tintColor: "#000",
  },
  title: {
    fontFamily: FontFamily.galada,
    fontSize: 36,
    color: "#000",
    textAlign: "center",
  },
  imageContainer: {
    width: "100%",
    height: "45%",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  girlImage: {
    width: "100%",
    height: "100%",
  },
  premiumBanner: {
    paddingVertical: 10,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    position: "relative",
  },
  premiumGlow: {
    position: "absolute",
    width: screenWidth * 1.5,
    height: 180,
  },
  starIcon: {
    width: 28,
    height: 28,
    marginHorizontal: 10,
  },
  premiumText: {
    fontFamily: FontFamily.bold,
    fontSize: 26,
    color: "#000",
  },
  featuresList: {
    width: "100%",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkIcon: {
    marginRight: 15,
  },
  featureText: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: "#000",
  },
  subscribeButton: {
    width: "100%",
    height: 60,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#FFB800",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginTop: "auto",
    marginBottom: 20,
  },
  gradientBorder: {
    flex: 1,
    padding: 2, // The "border" thickness
    borderRadius: 16,
  },
  buttonInner: {
    flex: 1,
    backgroundColor: "#FFCD07", // The solid inner color
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  buttonLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: "#000",
    left: 10,
  },
  buttonPrice: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: "#000",
  },
  buttonPricePlaceholder: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: "#000",
  },
});
