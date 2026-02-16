import { Theme } from "@/constants/colors";
import { useTheme } from "@/context/theme-context";
import React from "react";
import {
  Modal as DefaultModal,
  Pressable as DefaultPressable,
  ScrollView as DefaultScrollView,
  Text as DefaultText,
  TextInput as DefaultTextInput,
  View as DefaultView,
  StatusBar,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import {
  SafeAreaView as DefaultSafeAreaView,
  SafeAreaViewProps,
} from "react-native-safe-area-context";

// Helper function to create themed styles
export const createThemedStyles = <T extends Record<string, any>>(
  styleCreator: (theme: Theme) => T,
) => {
  return (theme: Theme): T => styleCreator(theme);
};

// Enhanced component props with theme variants
type ThemedProps = {
  variant?: "primary" | "secondary" | "error" | "success";
  themeColor?: keyof Theme;
  modalContainerStyle?: StyleProp<ViewStyle>;
};

export type ThemedTextProps = DefaultText["props"] & ThemedProps;
export type ThemedViewProps = DefaultView["props"] &
  ThemedProps & {
    backgroundVariant?:
      | "background"
      | "modalBackground"
      | "cardBackground"
      | "textInputBackground";
  };
export type ThemedTextInputProps = DefaultTextInput["props"] & ThemedProps;
export type ThemedScrollViewProps = DefaultScrollView["props"] &
  ThemedProps & {
    backgroundVariant?:
      | "background"
      | "modalBackground"
      | "cardBackground"
      | "textInputBackground";
  };
export type ThemedPressableProps = React.ComponentProps<
  typeof DefaultPressable
> &
  ThemedProps;
export type ThemedModalProps = DefaultModal["props"] & ThemedProps;
export type ThemedSafeAreaViewProps = SafeAreaViewProps &
  ThemedProps & {
    backgroundVariant?:
      | "background"
      | "modalBackground"
      | "cardBackground"
      | "textInputBackground";
  };

// Themed Text Component
export function Text(props: ThemedTextProps) {
  const { style, variant = "primary", themeColor, ...otherProps } = props;
  const { theme } = useTheme();

  let color = theme.textPrimary;
  if (themeColor && theme[themeColor]) {
    color = theme[themeColor] as string;
  } else if (variant === "secondary") {
    color = theme.textSecondary;
  } else if (variant === "error") {
    color = theme.error;
  } else if (variant === "success") {
    color = theme.success;
  }

  return <DefaultText style={[{ color }, style]} {...otherProps} />;
}

// Themed View Component
export function View(props: ThemedViewProps) {
  const {
    style,
    backgroundVariant = "background",
    themeColor,
    ...otherProps
  } = props;
  const { theme } = useTheme();

  let backgroundColor = theme.background;
  if (themeColor && theme[themeColor]) {
    backgroundColor = theme[themeColor] as string;
  } else if (backgroundVariant === "modalBackground") {
    backgroundColor = theme.modalBackground;
  } else if (backgroundVariant === "cardBackground") {
    backgroundColor = theme.cardBackground;
  } else if (backgroundVariant === "textInputBackground") {
    backgroundColor = theme.textInputBackground;
  }

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}

// Themed TextInput Component
export function TextInput(props: ThemedTextInputProps) {
  const { style, variant, ...otherProps } = props;
  const { theme } = useTheme();

  const inputStyle: TextStyle = {
    color: theme.textPrimary,
    backgroundColor: theme.textInputBackground,
  };

  return (
    <DefaultTextInput
      style={[inputStyle, style]}
      placeholderTextColor={theme.textSecondary}
      {...otherProps}
    />
  );
}

// Themed ScrollView Component
export function ScrollView(props: ThemedScrollViewProps) {
  const { style, backgroundVariant = "background", ...otherProps } = props;
  const { theme } = useTheme();

  let backgroundColor = theme.background;
  if (backgroundVariant === "modalBackground") {
    backgroundColor = theme.modalBackground;
  } else if (backgroundVariant === "cardBackground") {
    backgroundColor = theme.cardBackground;
  }

  return (
    <DefaultScrollView style={[{ backgroundColor }, style]} {...otherProps} />
  );
}

// Themed SafeAreaView Component
export function SafeAreaView(props: ThemedSafeAreaViewProps) {
  const { style, backgroundVariant = "background", ...otherProps } = props;
  const { theme } = useTheme();

  let backgroundColor = theme.background;
  if (backgroundVariant === "modalBackground") {
    backgroundColor = theme.modalBackground;
  } else if (backgroundVariant === "cardBackground") {
    backgroundColor = theme.cardBackground;
  }

  return (
    <DefaultSafeAreaView style={[{ backgroundColor }, style]} {...otherProps} />
  );
}

// Themed Pressable Component
export const Pressable = React.forwardRef<
  React.ElementRef<typeof DefaultPressable>,
  ThemedPressableProps
>((props, ref) => {
  const { style, variant, ...otherProps } = props;
  const { theme } = useTheme();

  const pressableStyle: ViewStyle =
    variant === "primary"
      ? {
          backgroundColor: theme.accent,
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 12,
          justifyContent: "center",
          alignItems: "center",
        }
      : variant === "secondary"
        ? {
            backgroundColor: theme.cardBackground,
            borderColor: theme.borderPrimary,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            justifyContent: "center",
            alignItems: "center",
          }
        : {};

  return (
    <DefaultPressable
      ref={ref}
      style={[pressableStyle, style as any]}
      {...otherProps}
    />
  );
});

// Themed Modal Component
export function Modal(props: ThemedModalProps) {
  const { children, modalContainerStyle, ...otherProps } = props;
  const { theme } = useTheme();

  return (
    <DefaultModal {...otherProps}>
      <View
        style={[
          {
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 50,
          },
          modalContainerStyle,
        ]}
      >
        <View
          backgroundVariant="modalBackground"
          style={{
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: theme.modalBorder,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          {children}
        </View>
      </View>
    </DefaultModal>
  );
}

export const commonThemedStyles = createThemedStyles((theme: Theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingTop: (StatusBar.currentHeight ?? 0) + 10,
  },
  modalBackground: {
    backgroundColor: theme.modalBackground,
  },
  cardBackground: {
    backgroundColor: theme.cardBackground,
  },
  textInputBackground: {
    backgroundColor: theme.textInputBackground,
  },
  primaryText: {
    color: theme.textPrimary,
  },
  secondaryText: {
    color: theme.textSecondary,
  },
  primaryBorder: {
    borderColor: theme.borderPrimary,
  },
  modalBorder: {
    borderColor: theme.modalBorder,
  },
  accentButton: {
    backgroundColor: theme.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: theme.cardBackground,
    borderColor: theme.borderPrimary,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  input: {
    backgroundColor: theme.textInputBackground,
    borderColor: theme.borderPrimary,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: theme.textPrimary,
  },
  modal: {
    backgroundColor: theme.modalBackground,
    borderColor: theme.modalBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
}));

// Hook to get common themed styles
export const useCommonThemedStyles = () => {
  const { theme } = useTheme();
  return commonThemedStyles(theme);
};
