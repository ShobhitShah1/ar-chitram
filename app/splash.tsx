import { useUser } from "@/context/user-context";
import { useRouter } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StatusBar, StyleSheet, View } from "react-native";

ExpoSplashScreen.preventAutoHideAsync();

export default function SplashScreen() {
  const router = useRouter();
  const { userName } = useUser();

  useEffect(() => {
    hideDefaultSplash();
    router.replace("/(auth)/login");
  }, []);

  const hideDefaultSplash = async () => {
    await ExpoSplashScreen.hideAsync();
  };

  const handleNavigation = () => {
    if (userName) {
      router.replace("/(tabs)/home");
    } else {
      router.replace("/(auth)/login");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  video: {
    width: "100%",
    height: "100%",
  },
});
