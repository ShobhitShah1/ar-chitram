import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState, useColorScheme } from "react-native";
import { darkTheme, lightTheme, Theme } from "../constants/colors";
import { storage } from "../utils/storage";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  autoThemeEnabled: boolean;
  setAutoThemeEnabled: (enabled: boolean) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@ArChitram/theme_mode";
const AUTO_THEME_STORAGE_KEY = "@ArChitram/auto_theme_mode";
const AUTO_THEME_DARK_START_HOUR = 19;
const AUTO_THEME_LIGHT_START_HOUR = 7;

const isAutoDarkTime = (date: Date) => {
  const hour = date.getHours();
  return (
    hour >= AUTO_THEME_DARK_START_HOUR || hour < AUTO_THEME_LIGHT_START_HOUR
  );
};

const getNextAutoThemeRefreshDelay = (date: Date) => {
  const nextRefresh = new Date(date);
  const hour = date.getHours();

  if (hour >= AUTO_THEME_DARK_START_HOUR) {
    nextRefresh.setDate(nextRefresh.getDate() + 1);
    nextRefresh.setHours(AUTO_THEME_LIGHT_START_HOUR, 0, 0, 0);
  } else if (hour >= AUTO_THEME_LIGHT_START_HOUR) {
    nextRefresh.setHours(AUTO_THEME_DARK_START_HOUR, 0, 0, 0);
  } else {
    nextRefresh.setHours(AUTO_THEME_LIGHT_START_HOUR, 0, 0, 0);
  }

  return Math.max(nextRefresh.getTime() - date.getTime(), 60_000);
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("light");
  const [autoThemeEnabled, setAutoThemeEnabledState] = useState(false);
  const [autoThemeTick, setAutoThemeTick] = useState(() => Date.now());
  const [isLoaded, setIsLoaded] = useState(false);

  // Determine if we should use dark theme
  const isDark =
    (autoThemeEnabled && isAutoDarkTime(new Date(autoThemeTick))) ||
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

        setAutoThemeEnabledState(
          storage.getBool(AUTO_THEME_STORAGE_KEY) ?? false,
        );
      } catch (error) {
        console.error("Failed to load theme mode:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadThemeMode();
  }, []);

  useEffect(() => {
    if (!autoThemeEnabled) {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const refreshTheme = () => {
      setAutoThemeTick((previous) => {
        const next = Date.now();
        return next === previous ? previous + 1 : next;
      });
    };

    const scheduleNextRefresh = () => {
      timeoutId = setTimeout(() => {
        refreshTheme();
        scheduleNextRefresh();
      }, getNextAutoThemeRefreshDelay(new Date()));
    };

    scheduleNextRefresh();

    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          refreshTheme();
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          scheduleNextRefresh();
        }
      },
    );

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      appStateSubscription.remove();
    };
  }, [autoThemeEnabled]);

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

  const setAutoThemeEnabled = (enabled: boolean) => {
    try {
      storage.setBool(AUTO_THEME_STORAGE_KEY, enabled);
      setAutoThemeEnabledState(enabled);
      if (enabled) {
        setAutoThemeTick(Date.now());
      }
    } catch (error) {
      console.error("Failed to save auto theme mode:", error);
      setAutoThemeEnabledState(enabled);
      if (enabled) {
        setAutoThemeTick(Date.now());
      }
    }
  };

  // Don't render children until theme is loaded
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        setThemeMode,
        autoThemeEnabled,
        setAutoThemeEnabled,
        isDark,
      }}
    >
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
  styleCreator: (theme: Theme) => T,
): T => {
  const { theme } = useTheme();
  return styleCreator(theme);
};
