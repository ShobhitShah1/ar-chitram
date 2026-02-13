import { StatusBar, StyleSheet, Text, View } from "react-native";
import React from "react";
import { Image } from "expo-image";
import { welcome } from "@/assets/images";
import { ic_welcome_facebook, ic_welcome_google } from "@/assets/icons";
import { FontFamily, typography } from "@/constants/fonts";
import SocialButton from "@/components/login/social-button";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, useThemedStyles } from "@/context/theme-context";
import { Theme } from "@/constants/colors";
import { router } from "expo-router";

const Login = () => {
  const { isDark } = useTheme();

  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(styleCreator);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={styles.titleContainer}>
        <Text style={styles.appTitle}>AR Chitram</Text>
      </View>

      <View style={styles.imageContainer}>
        <Image source={welcome} contentFit="fill" style={styles.image} />
      </View>

      <View
        style={[
          styles.bottomContainer,
          { paddingBottom: Math.max(insets.bottom, 40) },
        ]}
      >
        <View style={styles.headerTextContainer}>
          <Text style={styles.loginTitle}>Login</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.buttonsContainer}>
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
    </View>
  );
};

export default Login;

const styleCreator = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      alignItems: "center",
    },
    titleContainer: {
      marginTop: 20,
      alignItems: "center",
      zIndex: 10,
    },
    appTitle: {
      fontFamily: FontFamily.pattaya,
      fontSize: 42,
      color: theme.textPrimary,
    },
    imageContainer: {
      flex: 1,
      top: 60,
      width: "100%",
      justifyContent: "center",
      alignItems: "center",
    },
    image: {
      width: "90%",
      height: "170%",
    },
    bottomContainer: {
      width: "100%",
      paddingHorizontal: 24,
      alignItems: "center",
      paddingBottom: 20,
    },
    headerTextContainer: {
      alignItems: "center",
      marginBottom: 20,
    },
    loginTitle: {
      ...typography.h2,
      fontSize: 28,
      color: theme.textPrimary,
      marginBottom: 3,
    },
    subtitle: {
      ...typography.body,
      color: "rgba(5, 5, 5, 1)",
    },
    buttonsContainer: {
      gap: 0,
      width: "100%",
      marginBottom: 50,
      alignItems: "center",
    },
    footer: {
      marginTop: 20,
      alignItems: "center",
    },
    footerText: {
      ...typography.caption,
      color: "rgba(43, 43, 43, 1)",
      textAlign: "center",
    },
    termsRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    linkText: {
      ...typography.caption,
      color: theme.textPrimary,
      fontFamily: FontFamily.bold,
      textDecorationLine: "underline",
    },
  });
