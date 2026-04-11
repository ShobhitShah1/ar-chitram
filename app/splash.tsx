import { useUser } from "@/context/user-context";
import { useWarmCoreTabAssets } from "@/hooks/api";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import LottieView from "lottie-react-native";

ExpoSplashScreen.preventAutoHideAsync();

export default function SplashScreen() {
  const router = useRouter();
  const warmCoreTabAssets = useWarmCoreTabAssets();
  const { userName } = useUser();
  const { hydrated, accessToken, user } = useAuthStore();
  const [isAnimationDone, setIsAnimationDone] = useState(false);
  const isNavigated = useRef(false);

  const isAuthenticated = useMemo(
    () => !!accessToken && !!user?.id,
    [accessToken, user?.id],
  );

  useEffect(() => {
    // Hide default splash as soon as our component is mounted.
    ExpoSplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      // Pre-warm assets while the splash animation is playing so it's ready faster
      warmCoreTabAssets({ timeoutMs: 5000 }).catch(() => {});
    }
  }, [hydrated, isAuthenticated, warmCoreTabAssets]);

  useEffect(() => {
    if (isNavigated.current || !hydrated || !isAnimationDone) {
      return;
    }

    isNavigated.current = true;

    const navigateFromSplash = async () => {
      if (isAuthenticated || !!userName) {
        router.replace("/(tabs)/home");
        return;
      }

      router.replace("/(auth)/login");
    };

    void navigateFromSplash();
  }, [hydrated, isAnimationDone, isAuthenticated, userName, router]);

  return (
    <View style={styles.container}>
      <LottieView
        source={require("../assets/animation/splash.json")}
        autoPlay
        loop={false}
        onAnimationFinish={() => setIsAnimationDone(true)}
        style={styles.lottie}
        resizeMode="cover"
      />
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
  lottie: {
    width: "100%",
    height: "100%",
  },
});
