import { FontFamily } from "@/constants/fonts";
import { useTheme } from "@/context/theme-context";
import { Platform } from "react-native";

export const useCommonHeaderOptions = () => {
  const { theme } = useTheme();

  return {
    headerShown: true,
    headerStyle: {
      backgroundColor: theme.background,
      borderBottomWidth: 0.5,
      borderBottomColor: theme.borderPrimary,
      elevation: 0,
      shadowOpacity: 0,
    },
    headerTitleStyle: {
      fontSize: 17,
      fontFamily: FontFamily.semibold,
      color: theme.textPrimary,
    },
    headerTintColor: theme.textPrimary,
    headerBackTitleVisible: false,
    headerShadowVisible: false,
    headerLargeTitle: false,
    headerTitleAlign: "center" as const,
    headerLeftContainerStyle: {
      paddingLeft: Platform.OS === "ios" ? 16 : 4,
    },
    headerRightContainerStyle: {
      paddingRight: Platform.OS === "ios" ? 16 : 4,
    },
    headerTitleContainerStyle: {
      paddingHorizontal: 0,
    },
    ...(Platform.OS === "android" && {
      headerTitleAlign: "center" as const,
      statusBarBackgroundColor: theme.background,
    }),
  };
};

export const getHeaderOptions = (title: string, options?: any) => {
  return {
    title,
    ...options,
  };
};
