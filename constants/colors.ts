// Theme configuration
export interface Theme {
  // Main colors
  background: string;
  modalBackground: string;
  cardBackground: string;
  textInputBackground: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;

  // Border colors
  borderPrimary: string;
  modalBorder: string;

  // Component colors
  accent: string;
  secondary: string;
  error: string;
  success: string;

  // Auth colors
  authBackground: string;
  authBorder: string;
  authButton: string;

  // Legacy support
  tint: string;
  tabIconDefault: string;
  tabIconSelected: string;

  buttonGradientColor?: string[];
  drawingButton: string[];

  // Tab bar gradients
  tabBarGradient: string[];
  tabBarBorderGradient: string[];
  tabBubbleGradient: string[];
  centerTabBubbleGradient: string[];

  // Drawing Card
  drawingCardBackground: string;
  drawingCardShadow: string;
}

// Light theme (current/default)
export const lightTheme: Theme = {
  // Main colors
  background: "#FAFAFA",
  // background: "#FFFFFF",
  modalBackground: "#FFFFFF",
  cardBackground: "#fff",
  textInputBackground: "#fff",

  // Text colors
  textPrimary: "#1C1C1E",
  textSecondary: "#B4B4B4",

  // Border colors
  borderPrimary: "#E5E5EA",
  modalBorder: "#E5E5EA",

  // Component colors
  accent: "rgba(50, 89, 244, 1)",
  secondary: "#FF3B30",
  error: "#FF3B30",
  success: "#34C759",

  // Auth colors
  authBackground: "rgba(243, 243, 243, 1)",
  authBorder: "rgba(135, 132, 254, 1)",
  authButton: "rgba(50, 89, 244, 1)",

  // Legacy support
  tint: "#2f95dc",
  tabIconDefault: "#ccc",
  tabIconSelected: "#2f95dc",

  buttonGradientColor: ["rgba(0, 243, 248, 1)", "rgba(0, 73, 191, 1)"],
  drawingButton: ["rgba(94,94,94,1)", "rgba(62,62,62,1)", "rgba(31,31,31,1)"],

  // Tab bar gradients
  tabBarGradient: [
    "#FFFFFF",
    "#FEFEFE",
    "#F7F7F7",
    "#F2F2F2",
    "#EDEDED",
    "#E9E9E9",
  ],
  tabBarBorderGradient: ["rgba(201, 196, 196, 1)", "rgba(201, 196, 196, 1)"],
  tabBubbleGradient: [
    "rgba(128, 128, 128, 1)",
    "rgba(96, 96, 96, 1)",
    "rgba(45, 45, 45, 1)",
    "rgba(19, 19, 19, 1)",
  ],
  centerTabBubbleGradient: [
    "rgba(128, 128, 128, 1)",
    "rgba(96, 96, 96, 1)",
    "rgba(45, 45, 45, 1)",
    "rgba(19, 19, 19, 1)",
  ],
  drawingCardBackground: "#FFFFFF",
  drawingCardShadow: "0px 0px 10px 0px rgba(0,0,0,0.05)",
};

// Dark theme (new)
export const darkTheme: Theme = {
  // Main colors
  background: "#A2A2A2",
  // background: "rgba(0, 3, 6, 1)",
  modalBackground: "rgba(14, 20, 27, 1)",
  cardBackground: "rgba(212, 212, 212, 1)",
  textInputBackground: "rgba(14, 20, 27, 1)",

  // Text colors
  textPrimary: "#000000",
  textSecondary: "#484848",

  // Border colors
  borderPrimary: "rgba(83, 145, 245, 1)",
  modalBorder: "rgba(83, 145, 245, 1)",

  // Component colors
  accent: "#007AFF",
  secondary: "#FF3B30",
  error: "#FF3B30",
  success: "#34C759",

  // Auth colors
  authBackground: "rgba(14, 20, 27, 1)",
  authBorder: "rgba(83, 145, 245, 1)",
  authButton: "rgba(50, 89, 244, 1)",

  // Legacy support
  tint: "#fff",
  tabIconDefault: "#ccc",
  tabIconSelected: "#fff",

  buttonGradientColor: ["rgba(0, 243, 248, 1)", "rgba(0, 73, 191, 1)"],
  drawingButton: ["rgba(78,78,78,1)", "rgba(48,48,48,1)", "rgba(34,34,34,1)"],

  // Tab bar gradients
  tabBarGradient: [
    "rgba(227, 227, 227, 1)",
    "rgba(216, 216, 216, 1)",
    "rgba(205, 205, 205, 1)",
    "rgba(195, 195, 195, 1)",
    "rgba(188, 188, 188, 1)",
    "rgba(182, 182, 182, 1)",
  ],
  tabBarBorderGradient: ["rgba(148, 148, 148, 1)", "rgba(148, 148, 148, 1)"],
  tabBubbleGradient: [
    "rgba(128, 128, 128, 1)",
    "rgba(96, 96, 96, 1)",
    "rgba(45, 45, 45, 1)",
    "rgba(19, 19, 19, 1)",
  ],
  centerTabBubbleGradient: ["#808080", "#606060", "#2D2D2D", "#131313"],
  drawingCardBackground: "#E4E4E4",
  drawingCardShadow: "0px 0px 10px 0px rgba(0,0,0,0.1)",
};

// Backward compatibility exports
export const ACCENT_COLOR = lightTheme.accent;
export const AUTH_BACKGROUND = lightTheme.authBackground;
export const SECONDARY_COLOR = lightTheme.secondary;
export const BACKGROUND_COLOR = lightTheme.background;
export const CARD_COLOR = lightTheme.cardBackground;
export const GLASS_COLOR = "rgba(248, 249, 250, 0.95)";
export const ERROR_COLOR = lightTheme.error;
export const SUCCESS_COLOR = lightTheme.success;
export const TEXT_PRIMARY = lightTheme.textPrimary;
export const TEXT_SECONDARY = lightTheme.textSecondary;
export const BORDER_COLOR = lightTheme.borderPrimary;
export const SEARCH_BACKGROUND = lightTheme.textInputBackground;
export const DARK = "#000";
export const AUTH_BORDER_COLOR = lightTheme.authBorder;
export const AUTH_BUTTON_COLOR = lightTheme.authButton;
export const BUTTON_GRADIENT_COLOR = lightTheme.buttonGradientColor;

// Legacy export for compatibility
export default {
  light: {
    text: lightTheme.textPrimary,
    background: lightTheme.background,
    tint: lightTheme.tint,
    tabIconDefault: lightTheme.tabIconDefault,
    tabIconSelected: lightTheme.tabIconSelected,
    buttonGradientColor: lightTheme.buttonGradientColor,
  },
  dark: {
    text: darkTheme.textPrimary,
    background: darkTheme.background,
    tint: darkTheme.tint,
    tabIconDefault: darkTheme.tabIconDefault,
    tabIconSelected: darkTheme.tabIconSelected,
    buttonGradientColor: darkTheme.buttonGradientColor,
  },
};
