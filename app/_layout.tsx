import { FONT_ASSETS } from "@/constants/fonts";
import { ProfileProvider } from "@/context/profile-context";
import QueryProvider from "@/context/query-provider";
import { IAPProvider } from "@/context/iap-context";
import { AppUpdateModal } from "@/components/app-update-modal";
import {
  ThemeProvider as CustomThemeProvider,
  useTheme,
} from "@/context/theme-context";
import { UserProvider } from "@/context/user-context";
import { initializeApiAuth } from "@/hooks/api/use-auth-api";
import { ensureMobileAdsInitialized } from "@/services/mobile-ads-service";
import { preloadRewardedAds } from "@/services/rewarded-ad-service";
import { handleVersionTracking } from "@/services/version-tracking-service";
import { logAppOpen } from "@/services/analytics-service";
import {
  checkForStoreUpdate,
  startStoreUpdate,
} from "@/services/app-update-service";
import { useCommonHeaderOptions } from "@/utils/header-config";
import { toastConfig } from "@/utils/toast-config";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import "react-native-reanimated";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import Toast from "react-native-toast-message";

import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "splash",
};

function ThemedNavigator() {
  const { isDark } = useTheme();

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <MainNavigator />
    </ThemeProvider>
  );
}

function MainNavigator() {
  const { isDark } = useTheme();
  const headerOptions = useCommonHeaderOptions();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestStoreVersion, setLatestStoreVersion] = useState<string | null>(
    null,
  );
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    initAuth();
    // initVersionTracking();
    void initStoreVersionCheck();
  }, []);

  const initAuth = async () => {
    try {
      await initializeApiAuth();
    } catch (error) {
      console.error("Error initializing API auth:", error);
    }
  };

  const initVersionTracking = async () => {
    try {
      await handleVersionTracking();
    } catch (error) {
      console.error("Error initializing version tracking:", error);
    }
  };

  const initStoreVersionCheck = async () => {
    try {
      const updateInfo = await checkForStoreUpdate();
      if (!updateInfo?.isAvailable) {
        return;
      }

      setLatestStoreVersion(updateInfo.latestVersion ?? null);
      setUpdateAvailable(true);
    } catch (error) {
      console.error("Error checking store update:", error);
    }
  };

  const handlePressUpdate = async () => {
    if (isUpdating) {
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await startStoreUpdate();
      if (!updated) {
        setIsUpdating(false);
      }
    } catch (error) {
      console.error("Failed to start store update:", error);
      setIsUpdating(false);
    }
  };

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <Stack
        screenOptions={{ headerShown: false, animation: "ios_from_right" }}
      >
        <Stack.Screen name="index" options={{ animation: "fade" }} />
        <Stack.Screen name="splash" options={{ animation: "fade" }} />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="privacy-policy"
          options={{ ...headerOptions, title: "Privacy Policy" }}
        />
        <Stack.Screen
          name="terms-of-use"
          options={{ ...headerOptions, title: "Terms of Use" }}
        />
        <Stack.Screen
          name="open-source-license"
          options={{ ...headerOptions, title: "Open Source Licenses" }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>

      <AppUpdateModal
        visible={updateAvailable}
        latestVersion={latestStoreVersion ?? undefined}
        isUpdating={isUpdating}
        onUpdatePress={handlePressUpdate}
      />
    </>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ ...FONT_ASSETS, ...FontAwesome.font });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    logAppOpen();
    ensureMobileAdsInitialized().catch((error) => {
      console.error("[Ads] Failed to initialize Mobile Ads SDK", error);
    });
    preloadRewardedAds("app-start").catch((error) => {
      console.error("[Ads] Failed to preload rewarded ads", error);
    });
  }, []);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryProvider>
        <CustomThemeProvider>
          <UserProvider>
            <IAPProvider>
              <ProfileProvider>
                <KeyboardProvider>
                  <BottomSheetModalProvider>
                    <ThemedNavigator />
                    <Toast config={toastConfig} position="top" />
                  </BottomSheetModalProvider>
                </KeyboardProvider>
              </ProfileProvider>
            </IAPProvider>
          </UserProvider>
        </CustomThemeProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  );
}
