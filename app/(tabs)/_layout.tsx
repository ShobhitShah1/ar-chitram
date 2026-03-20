import {
  ic_color_pallete_dark,
  ic_color_pallete_light,
  ic_drawing_dark,
  ic_drawing_light,
  ic_gallery_dark,
  ic_gallery_light,
  ic_home_light,
  ic_sketch_dark,
  ic_sketch_light,
} from "@/assets/icons";
import {
  CreateAssetPickerSheet,
  type CreateSheetAssetItem,
} from "@/features/virtual-creativity/components/create-asset-picker-sheet";
import { ImageUploadFlowModal } from "@/features/virtual-creativity/components/image-upload-flow-modal";
import TabItem from "@/components/tab-item";
import { ProfileProvider } from "@/context/profile-context";
import { useTheme } from "@/context/theme-context";
import { fetchLocalUploadTabAssets, persistLocalUploadAsset } from "@/features/virtual-creativity/services/local-upload-asset-service";
import { useCreateFlowTabAssetsGrid } from "@/hooks/api";
import { useImageUploadFlow } from "@/features/virtual-creativity/hooks/use-image-upload-flow";
import { createMainImageLayer } from "@/features/virtual-creativity/services/virtual-layer-service";
import { apiQueryKeys } from "@/services/api/query-keys";
import { useVirtualCreativityStore } from "@/features/virtual-creativity/store/virtual-creativity-store";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router, Tabs, usePathname } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { BackHandler, Platform, StyleSheet, View } from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnUI } from "react-native-worklets";

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  onCreatePress: () => void;
}

const CustomTabBar: React.FC<CustomTabBarProps> = ({
  state,
  navigation,
  onCreatePress,
}) => {
  const { theme } = useTheme();

  const handleTabPress = useCallback(
    (routeName: string) => {
      if (routeName === "home") {
        if (state.index === 2) {
          onCreatePress();
          return;
        }

        const homeEvent = navigation.emit({
          type: "tabPress",
          target: routeName,
          canPreventDefault: true,
        });

        if (!homeEvent.defaultPrevented) {
          requestAnimationFrame(() => {
            navigation.navigate(routeName);
          });
        }
        return;
      }

      const event = navigation.emit({
        type: "tabPress",
        target: routeName,
        canPreventDefault: true,
      });

      if (!event.defaultPrevented) {
        requestAnimationFrame(() => {
          navigation.navigate(routeName);
        });
      }
    },
    [state.index, navigation, onCreatePress],
  );

  return (
    <View style={styles.tabContainer}>
      <LinearGradient
        colors={theme.tabBarBorderGradient as [string, string, ...string[]]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.gradientBorder}
      >
        <LinearGradient
          colors={theme.tabBarGradient as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.floatingBar}
        >
          <TabItem
            label="Colors"
            imageSource={
              state.index === 0 ? ic_color_pallete_dark : ic_color_pallete_light
            }
            isFocused={state.index === 0}
            onPress={() => handleTabPress("colors")}
          />

          <TabItem
            label="Sketch"
            imageSource={state.index === 1 ? ic_sketch_dark : ic_sketch_light}
            isFocused={state.index === 1}
            onPress={() => handleTabPress("sketch")}
          />

          <TabItem
            label="Create"
            imageSource={ic_home_light}
            isFocused={state.index === 2}
            onPress={() => handleTabPress("home")}
            isCenter
          />

          <TabItem
            label="Drawing"
            imageSource={state.index === 3 ? ic_drawing_dark : ic_drawing_light}
            isFocused={state.index === 3}
            onPress={() => handleTabPress("drawing")}
          />

          <TabItem
            label="Gallery"
            imageSource={state.index === 4 ? ic_gallery_dark : ic_gallery_light}
            isFocused={state.index === 4}
            onPress={() => handleTabPress("gallery")}
          />
        </LinearGradient>
      </LinearGradient>
    </View>
  );
};

export default function TabLayout() {
  const pathname = usePathname();
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  const createSheetRef = useRef<BottomSheetModal | null>(null);
  const isCreateSheetVisibleRef = useRef(false);
  const queryClient = useQueryClient();

  const { gridItems, isLoading, isError, refetch } = useCreateFlowTabAssetsGrid();
  const setLayers = useVirtualCreativityStore((state) => state.setLayers);

  const createAssets = useMemo<CreateSheetAssetItem[]>(
    () =>
      gridItems
        .filter((item) => Boolean(item.image))
        .map((item) => ({
          id: String(item.id),
          image: item.image,
          isPremium: item.isPremium,
        })),
    [gridItems],
  );

  const openCreateSheet = useCallback(() => {
    if (isCreateSheetVisibleRef.current) {
      return;
    }

    isCreateSheetVisibleRef.current = true;
    createSheetRef.current?.present();
  }, []);

  const closeCreateSheet = useCallback(() => {
    if (!isCreateSheetVisibleRef.current) {
      return;
    }

    isCreateSheetVisibleRef.current = false;
    createSheetRef.current?.dismiss();
  }, []);

  const openCanvasWithImage = useCallback(
    (uri: string) => {
      setLayers([createMainImageLayer(uri)], null);
      closeCreateSheet();

      requestAnimationFrame(() => {
        router.push("/virtual-creativity");
      });
    },
    [closeCreateSheet, setLayers],
  );

  const handleCreateDone = useCallback(
    (item: CreateSheetAssetItem) => {
      openCanvasWithImage(item.image);
    },
    [openCanvasWithImage],
  );

  const { startUploadFlow, isPickingImage, modalProps } = useImageUploadFlow({
    title: "Upload Your Own Image",
    description:
      "Pick a photo, preview the background removal, then continue into Virtual Creativity.",
    doneLabel: "Continue",
    onComplete: async ({ finalUri }) => {
      const persistedUpload = await persistLocalUploadAsset(finalUri);
      queryClient.setQueryData(
        apiQueryKeys.assets.localUploads,
        await fetchLocalUploadTabAssets(),
      );
      openCanvasWithImage(persistedUpload.uri);
    },
  });

  const handleRetryCreateAssets = useCallback(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    const animate = () => {
      "worklet";
      if (pathname !== "/gallery") {
        translateY.value = withTiming(100, {
          duration: 300,
          easing: Easing.inOut(Easing.ease),
        });
        opacity.value = withTiming(0, {
          duration: 300,
          easing: Easing.inOut(Easing.ease),
        });
      } else {
        translateY.value = withTiming(0, {
          duration: 400,
          easing: Easing.out(Easing.cubic),
        });
        opacity.value = withTiming(1, {
          duration: 400,
          easing: Easing.out(Easing.cubic),
        });
      }
    };

    scheduleOnUI(animate);
  }, [opacity, pathname, translateY]);

  useEffect(() => {
    const onBackPress = () => {
      if (Platform.OS !== "android") {
        return false;
      }

      if (isCreateSheetVisibleRef.current) {
        closeCreateSheet();
        return true;
      }

      if (pathname === "/home") {
        return true;
      }

      return false;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [closeCreateSheet, pathname]);

  return (
    <ProfileProvider>
      <>
        <Tabs
          tabBar={(props) => (
            <CustomTabBar {...props} onCreatePress={openCreateSheet} />
          )}
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: "none" },
            animation: "none",
          }}
          initialRouteName="home"
          backBehavior="initialRoute"
        >
          <Tabs.Screen name="colors" />
          <Tabs.Screen name="sketch" />
          <Tabs.Screen name="home" options={{ lazy: false }} />
          <Tabs.Screen name="drawing" />
          <Tabs.Screen name="gallery" />
        </Tabs>

        <CreateAssetPickerSheet
          modalRef={createSheetRef}
          assets={createAssets}
          isLoading={isLoading}
          isError={isError}
          onClose={closeCreateSheet}
          onDone={handleCreateDone}
          onRetry={handleRetryCreateAssets}
          onUploadPress={() => {
            void startUploadFlow();
          }}
          isUploadActionBusy={isPickingImage}
        />

        <ImageUploadFlowModal {...modalProps} />
      </>
    </ProfileProvider>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    zIndex: 99,
    alignItems: "center",
  },
  gradientBorder: {
    width: "100%",
    borderRadius: 30,
    padding: 1.5,
    boxShadow: "0px 0px 25px 0px rgba(0, 0, 0, 0.15)",
  },
  floatingBar: {
    flexDirection: "row",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: "100%",
    height: 55,
  },
});
