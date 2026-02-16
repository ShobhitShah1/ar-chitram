import React from "react";
import { SafeAreaView } from "../components/themed";
import { StatusBar } from "react-native";
import { useTheme } from "@/context/theme-context";

interface ThemeWrapperProps {
  children: React.ReactNode;
  statusBarStyle?: "light-content" | "dark-content" | "default";
  backgroundColor?: "background" | "modalBackground" | "cardBackground";
}

/**
 * A higher-order component that automatically applies theme styling to any screen
 * Usage: Wrap your screen content with this component
 */
export const ThemeWrapper: React.FC<ThemeWrapperProps> = ({
  children,
  statusBarStyle,
  backgroundColor = "background",
}) => {
  const { isDark } = useTheme();

  // Automatically determine status bar style based on theme if not provided
  const finalStatusBarStyle =
    statusBarStyle || (isDark ? "light-content" : "dark-content");

  return (
    <>
      <StatusBar
        barStyle={finalStatusBarStyle}
        backgroundColor="transparent"
        translucent
      />
      <SafeAreaView style={{ flex: 1 }} backgroundVariant={backgroundColor}>
        {children}
      </SafeAreaView>
    </>
  );
};

/**
 * Higher-order component function that wraps a screen component with theme support
 * Usage: export default withTheme(YourScreenComponent);
 */
export function withTheme<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    statusBarStyle?: "light-content" | "dark-content" | "default";
    backgroundColor?: "background" | "modalBackground" | "cardBackground";
  },
) {
  return function ThemedComponent(props: P) {
    return (
      <ThemeWrapper
        statusBarStyle={options?.statusBarStyle}
        backgroundColor={options?.backgroundColor}
      >
        <Component {...props} />
      </ThemeWrapper>
    );
  };
}

/**
 * Hook for getting theme-aware conditional styles
 * Usage: const conditionalStyle = useThemeConditional(lightStyle, darkStyle);
 */
export function useThemeConditional<T>(lightValue: T, darkValue: T): T {
  const { isDark } = useTheme();
  return isDark ? darkValue : lightValue;
}
