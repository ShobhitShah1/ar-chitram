import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { darkTheme, lightTheme, Theme } from "../constants/colors";
import { storage } from "../utiles/storage";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@gigglam/theme_mode";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("light");
  const [isLoaded, setIsLoaded] = useState(false);

  // Determine if we should use dark theme
  const isDark =
    themeMode === "dark" ||
    (themeMode === "system" && systemColorScheme === "dark");

  // Get the current theme
  const theme = isDark ? darkTheme : lightTheme;

  // Load theme preference from storage
  useEffect(() => {
    const loadThemeMode = () => {
      try {
        const savedMode = storage.getString(THEME_STORAGE_KEY);
        if (
          savedMode &&
          (savedMode === "light" ||
            savedMode === "dark" ||
            savedMode === "system")
        ) {
          setThemeModeState(savedMode as ThemeMode);
        }
      } catch (error) {
        console.error("Failed to load theme mode:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadThemeMode();
  }, []);

  // Save theme preference to storage
  const setThemeMode = (mode: ThemeMode) => {
    try {
      storage.setString(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error("Failed to save theme mode:", error);
      // Still update the state even if storage fails
      setThemeModeState(mode);
    }
  };

  // Don't render children until theme is loaded
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

// Hook to get themed styles
export const useThemedStyles = <T extends Record<string, any>>(
  styleCreator: (theme: Theme) => T
): T => {
  const { theme } = useTheme();
  return styleCreator(theme);
};
