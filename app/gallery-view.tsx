import {
  ic_facebook,
  ic_instagram,
  ic_share,
  ic_snapchat,
  ic_whatsapp,
} from "@/assets/icons";
import { GalleryItem } from "@/constants/interface";
import { useTheme } from "@/context/theme-context";
import { shareImage } from "@/services/share-service";
import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { memo, useCallback, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GalleryViewItem from "@/components/gallery-view-item";

const { width, height } = Dimensions.get("screen");

const socialButtons = [
  { icon: ic_facebook, color: "#1877F2", platform: "facebook" as const },
  { icon: ic_whatsapp, color: "#25D366", platform: "whatsapp" as const },
  { icon: ic_instagram, color: "#E4405F", platform: "instagram" as const },
  { icon: ic_snapchat, color: "#FFFC00", platform: "snapchat" as const },
  { icon: ic_share, color: "#666", platform: "more" as const },
];

const GalleryView = () => {
  const { images, initialIndex } = useLocalSearchParams<{
    images: string;
    initialIndex: string;
  }>();

  const [currentIndex, setCurrentIndex] = useState(
    initialIndex ? parseInt(initialIndex) : 0,
  );
  const { theme } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  });

  const HEADER_HEIGHT = Math.round(height * 0.13);
  const CONTENT_HEIGHT = height;

  const parsedImages: GalleryItem[] = images ? JSON.parse(images) : [];

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  });

  const handleSocialShare = useCallback(
    async (platform: (typeof socialButtons)[number]["platform"]) => {
      const currentImage = parsedImages[currentIndex];
      if (!currentImage) return;

      await shareImage({
        imageUri: currentImage.uri,
        platform,
        type: currentImage.mediaType === "video" ? "video" : "image",
      });
    },
    [currentIndex, parsedImages],
  );

  const scrollToIndex = (index: number) => {
    if (index >= 0 && index < parsedImages.length) {
      flatListRef.current?.scrollToOffset({
        offset: index * width,
        animated: false,
      });
      setCurrentIndex(index);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      scrollToIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < parsedImages.length - 1) {
      scrollToIndex(currentIndex + 1);
    }
  };

  const renderItem = useCallback(
    ({ item, index }: { item: GalleryItem; index: number }) => (
      <GalleryViewItem
        item={item}
        isActive={index === currentIndex}
        contentHeight={CONTENT_HEIGHT}
      />
    ),
    [CONTENT_HEIGHT, currentIndex],
  );

  const keyExtractor = useCallback((item: GalleryItem) => item.id, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [],
  );

  if (parsedImages.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={{ height: height, backgroundColor: theme.background }}>
        <FlatList
          ref={flatListRef}
          data={parsedImages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewabilityConfig.current}
          getItemLayout={getItemLayout}
          initialScrollIndex={currentIndex}
          scrollEnabled={parsedImages.length > 1}
          onScrollToIndexFailed={() => {}}
          removeClippedSubviews={false}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={7}
        />
      </View>

      <View
        style={[
          styles.headerContainer,
          {
            height: HEADER_HEIGHT,
            paddingTop: top + 10,
            position: "absolute",
            zIndex: 999,
          },
        ]}
      >
        <Pressable
          style={styles.headerButtonStatic}
          onPress={() => router.back()}
          hitSlop={20}
        >
          <Feather name="arrow-left" size={25} color={"white"} />
        </Pressable>
      </View>

      {currentIndex > 0 && (
        <Pressable
          style={[
            styles.navButtonLeft,
            // { top: height / 2 - 22 }
          ]}
          onPress={handlePrevious}
        >
          <Feather name="chevron-left" size={24} color="#fff" />
        </Pressable>
      )}

      {currentIndex < parsedImages.length - 1 && (
        <Pressable
          style={[
            styles.navButtonRight,
            // { top: height / 2 - 22 }
          ]}
          onPress={handleNext}
        >
          <Feather name="chevron-right" size={24} color="#fff" />
        </Pressable>
      )}

      <LinearGradient
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        colors={["rgba(0,0,0,0.85)", "rgba(0,0,0,0.4)", "transparent"]}
        style={[styles.socialGradient, { paddingBottom: bottom + 50 }]}
      >
        <View style={styles.socialContainer}>
          {socialButtons.map((button, index) => (
            <Pressable
              key={index}
              style={[styles.socialButton, { backgroundColor: button.color }]}
              onPress={() => handleSocialShare(button.platform)}
            >
              <Image
                source={button.icon}
                tintColor={
                  button.platform === "more" || button.platform === "instagram"
                    ? "#fff"
                    : undefined
                }
                contentFit="contain"
                style={[
                  styles.socialIcon,
                  button.platform === "more" && { right: 1.5 },
                ]}
              />
            </Pressable>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
};

export default memo(GalleryView);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    width: width,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  headerButtonStatic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(17, 15, 15, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerButton: {
    display: "none",
  },
  imageContainer: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
  navButtonLeft: {
    position: "absolute",
    left: 10,
    top: "50%",
    transform: [{ translateY: -20 }],
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(17, 15, 15, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  navButtonRight: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: [{ translateY: -20 }],
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(17, 15, 15, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  socialGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 150,
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 15,
  },
  socialButton: {
    width: 45,
    height: 45,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  socialIcon: {
    width: 25,
    height: 25,
  },
});
