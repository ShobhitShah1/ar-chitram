import { ic_welcome_facebook, ic_welcome_google } from "@/assets/icons";
import { welcome } from "@/assets/images";
import SocialButton from "@/components/login/social-button";
import { FontFamily } from "@/constants/fonts";
import { ImageBackground } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";

export default function Login() {
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
            onPress={() => router.replace("/(tabs)/home")}
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
