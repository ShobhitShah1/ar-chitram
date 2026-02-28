import { useUser } from "@/context/user-context";
import { useWarmCoreTabAssets } from "@/hooks/api";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, StatusBar, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

ExpoSplashScreen.preventAutoHideAsync();

export default function SplashScreen() {
  const router = useRouter();
  const warmCoreTabAssets = useWarmCoreTabAssets();
  const { userName } = useUser();
  const { hydrated, accessToken, user } = useAuthStore();
  const [isMinimumDurationDone, setIsMinimumDurationDone] = useState(false);
  const isNavigated = useRef(false);
  const pulse = useSharedValue(0.95);

  const isAuthenticated = useMemo(
    () => !!accessToken && !!user?.id,
    [accessToken, user?.id],
  );

  useEffect(() => {
    let isMounted = true;
    const MIN_DURATION_MS = 700;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    hideDefaultSplash().finally(() => {
      if (isMounted) {
        timeoutId = setTimeout(() => {
          if (isMounted) {
            setIsMinimumDurationDone(true);
          }
        }, MIN_DURATION_MS);
      }
    });

    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, {
          duration: 800,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0.95, {
          duration: 800,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      cancelAnimation(pulse);
    };
  }, [pulse]);

  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulse.value }],
    };
  });

  useEffect(() => {
    if (isNavigated.current || !hydrated || !isMinimumDurationDone) {
      return;
    }

    isNavigated.current = true;

    const navigateFromSplash = async () => {
      if (isAuthenticated || !!userName) {
        if (isAuthenticated) {
          await warmCoreTabAssets({ timeoutMs: 2500 });
        }
        router.replace("/(tabs)/home");
        return;
      }

      router.replace("/(auth)/login");
    };

    void navigateFromSplash();
  }, [
    hydrated,
    isMinimumDurationDone,
    isAuthenticated,
    userName,
    router,
    warmCoreTabAssets,
  ]);

  const hideDefaultSplash = async (): Promise<void> => {
    await ExpoSplashScreen.hideAsync();
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <Animated.View style={[styles.logoWrap, logoAnimatedStyle]}>
        <Image
          source={require("../assets/images/splash-icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 180,
    height: 180,
  },
});
