import { FONT_ASSETS } from "@/constants/fonts";
import { ProfileProvider } from "@/context/profile-context";
import QueryProvider from "@/context/query-provider";
import {
  ThemeProvider as CustomThemeProvider,
  useTheme,
} from "@/context/theme-context";
import { UserProvider } from "@/context/user-context";
import { initializeApiAuth } from "@/hooks/api/use-auth-api";
import { handleVersionTracking } from "@/services/version-tracking-service";
import { useCommonHeaderOptions } from "@/utiles/header-config";
import { toastConfig } from "@/utiles/toast-config";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { LogBox, StatusBar } from "react-native";
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

LogBox.ignoreAllLogs();

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

  useEffect(() => {
    initAuth();
    // initVersionTracking();
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
        {/* <Stack.Screen name="setting" options={{ headerShown: true }} /> */}
        {/* <Stack.Screen name="drawing/guide" /> */}
        {/* <Stack.Screen name="drawing/canvas" /> */}
        {/* <Stack.Screen name="drawing/preview" /> */}

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
            <ProfileProvider>
              <KeyboardProvider>
                <ThemedNavigator />
                <Toast config={toastConfig} position="bottom" />
              </KeyboardProvider>
            </ProfileProvider>
          </UserProvider>
        </CustomThemeProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  );
}
