import { ic_welcome_facebook, ic_welcome_google } from "@/assets/icons";
import { welcome } from "@/assets/images";
import SocialButton from "@/components/login/social-button";
import { FontFamily } from "@/constants/fonts";
import { useUser } from "@/context/user-context";
import { useWarmCoreTabAssets } from "@/hooks/api";
import { signInWithGoogleSession } from "@/services/auth-session-service";
import { useAuthStore } from "@/store/auth-store";
import { ImageBackground } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";

export default function Login() {
  const { setUserData } = useUser();
  const warmCoreTabAssets = useWarmCoreTabAssets();
  const isAuthenticated = useAuthStore(
    (state) => !!state.accessToken && !!state.user?.id,
  );
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const completeGoogleLogin = useCallback(
    async (sessionUser: {
      id: string;
      name: string | null;
      email: string | null;
      photo: string | null;
    }) => {
      await setUserData(
        sessionUser.name || sessionUser.email || "User",
        sessionUser.id,
        null,
        sessionUser.photo,
      );
      router.replace("/(tabs)/home");
    },
    [setUserData],
  );

  const handleGoogleLogin = useCallback(async () => {
    if (isGoogleLoading) {
      return;
    }

    setIsGoogleLoading(true);

    try {
      const result = await signInWithGoogleSession();

      if (result.type === "success") {
        await warmCoreTabAssets();
        await completeGoogleLogin(result.session.user);
        return;
      }

      if (result.type === "error") {
        Toast.show({
          type: "error",
          text1: "Google Login Failed",
          text2: result.message,
        });
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Google Login Failed",
        text2: "Something went wrong. Please try again.",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }, [completeGoogleLogin, isGoogleLoading, warmCoreTabAssets]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)/home");
    }
  }, [isAuthenticated]);

  return (
    <ImageBackground
      source={welcome}
      contentFit="cover"
      style={styles.conatiner}
      imageStyle={[
        styles.imageStyle,
        { top: (StatusBar.currentHeight ?? 0) + 90 },
      ]}
    >
      <View
        style={[
          styles.titleContainer,
          { paddingTop: (StatusBar.currentHeight ?? 0) + 20 },
        ]}
      >
        <Text style={styles.appTitle}>AR Chitram</Text>
      </View>

      <View
        style={{
          flex: 1,
          zIndex: 9999,
          justifyContent: "flex-end",
          alignItems: "center",
          height: "100%",
          paddingVertical: 15,
        }}
      >
        <View style={{ paddingBottom: 30, gap: 3 }}>
          <Text style={styles.loginTitle}>Login</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={{ gap: 5, paddingBottom: 50 }}>
          <SocialButton
            title="Login with Google"
            imageSource={ic_welcome_google}
            onPress={handleGoogleLogin}
            isLoading={isGoogleLoading}
            loadingText="Signing in..."
          />
          <SocialButton
            title="Login with Facebook"
            imageSource={ic_welcome_facebook}
            onPress={() => router.replace("/(tabs)/home")}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>By Login, you agree to our</Text>
          <View style={styles.termsRow}>
            <Text style={styles.linkText}>Terms of Service</Text>
            <Text style={styles.footerText}> and </Text>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </View>
        </View>
      </View>

      <LinearGradient
        colors={[
          "rgba(255,255,255,0.1)",
          "rgba(255,255,255,0.1)",
          "rgba(255,255,255,1)",
          "rgba(255,255,255,1)",
          "rgba(255,255,255,1)",
        ]}
        style={styles.gradient}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  conatiner: {
    flex: 1,
    backgroundColor: "#fff",
  },
  imageStyle: {
    width: "100%",
    height: "100%",
  },
  titleContainer: {
    marginTop: 20,
    alignItems: "center",
    zIndex: 10,
  },
  appTitle: {
    fontFamily: FontFamily.pattaya,
    fontSize: 42,
  },
  gradient: {
    flex: 1,
    bottom: 0,
    width: "100%",
    height: "100%",
    position: "absolute",
  },

  footer: {},
  footerText: {
    color: "rgba(43, 43, 43, 1)",
    textAlign: "center",
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  linkText: {
    fontFamily: FontFamily.bold,
    textDecorationLine: "underline",
  },

  loginTitle: {
    fontSize: 25,
    textAlign: "center",
    fontFamily: FontFamily.bold,
    color: "rgba(43, 43, 43, 1)",
  },
  subtitle: { fontSize: 15, textAlign: "center", color: "rgba(43, 43, 43, 1)" },
});
