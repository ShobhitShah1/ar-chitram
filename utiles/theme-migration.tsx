import { StyleSheet } from 'react-native';
import { Theme } from '@/constants/colors';
import { useTheme } from '@/context/theme-context';

/**
 * Migration utility for converting static StyleSheet to themed StyleSheet
 * This helps in quickly converting existing components to use themes
 */

// Common color mappings for migration
export const COLOR_MAPPINGS = {
  // Background colors
  '#fff': 'background',
  '#ffffff': 'background',
  '#FFFFFF': 'background',
  '#F8F9FA': 'cardBackground',
  '#F2F2F7': 'textInputBackground',

  // Text colors
  '#000': 'textPrimary',
  '#000000': 'textPrimary',
  '#1C1C1E': 'textPrimary',
  '#666': 'textSecondary',
  '#8E8E93': 'textSecondary',
  '#999': 'textSecondary',

  // Border colors
  '#E5E5EA': 'borderPrimary',
  '#ccc': 'borderPrimary',
  '#ddd': 'borderPrimary',
} as const;

type ColorMapping = keyof typeof COLOR_MAPPINGS;

/**
 * Automatically migrates color values to theme-aware colors
 */
export function migrateColorToTheme(color: string, theme: Theme): string {
  const mapping = COLOR_MAPPINGS[color as ColorMapping];
  if (mapping && theme[mapping as keyof Theme]) {
    return theme[mapping as keyof Theme] as string;
  }
  return color; // Return original color if no mapping found
}

/**
 * Creates a theme-aware StyleSheet with automatic color migration
 * Usage: const styles = createMigratedStyles((theme) => ({ ... }));
 */
export function createMigratedStyles<T extends Record<string, any>>(
  styleCreator: (theme: Theme) => T
) {
  return function useMigratedStyles() {
    const { theme } = useTheme();
    return StyleSheet.create(styleCreator(theme));
  };
}

/**
 * Quick migration function for existing StyleSheets
 * Automatically converts common colors to theme colors
 */
export function quickMigrateStyles<T extends Record<string, any>>(
  staticStyles: T,
  theme: Theme
): T {
  const migratedStyles = { ...staticStyles };

  // Recursively process styles
  function processStyle(obj: any): any {
    if (typeof obj === 'string') {
      return migrateColorToTheme(obj, theme);
    }

    if (Array.isArray(obj)) {
      return obj.map(processStyle);
    }

    if (obj && typeof obj === 'object') {
      const newObj: any = {};
      for (const [key, value] of Object.entries(obj)) {
        newObj[key] = processStyle(value);
      }
      return newObj;
    }

    return obj;
  }

  return processStyle(migratedStyles);
}

/**
 * Hook for quickly migrating existing styles
 * Usage: const styles = useQuickMigration(staticStyleSheet);
 */
export function useQuickMigration<T extends Record<string, any>>(staticStyles: T): T {
  const { theme } = useTheme();
  return quickMigrateStyles(staticStyles, theme);
}

/**
 * Theme-aware replacements for common style properties
 */
export const themeStyles = {
  // Common container styles
  screen: (theme: Theme) => ({
    flex: 1,
    backgroundColor: theme.background,
  }),

  modalContainer: (theme: Theme) => ({
    backgroundColor: theme.modalBackground,
    borderColor: theme.modalBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  }),

  card: (theme: Theme) => ({
    backgroundColor: theme.cardBackground,
    borderColor: theme.borderPrimary,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  }),

  input: (theme: Theme) => ({
    backgroundColor: theme.textInputBackground,
    borderColor: theme.borderPrimary,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: theme.textPrimary,
  }),

  primaryButton: (theme: Theme) => ({
    backgroundColor: theme.accent,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
  }),

  secondaryButton: (theme: Theme) => ({
    backgroundColor: theme.cardBackground,
    borderColor: theme.borderPrimary,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
  }),

  primaryText: (theme: Theme) => ({
    color: theme.textPrimary,
  }),

  secondaryText: (theme: Theme) => ({
    color: theme.textSecondary,
  }),

  errorText: (theme: Theme) => ({
    color: theme.error,
  }),

  successText: (theme: Theme) => ({
    color: theme.success,
  }),
};

/**
 * Hook to get all theme styles
 */
export function useThemeStyles() {
  const { theme } = useTheme();

  const styles: Record<string, any> = {};
  for (const [key, styleFunction] of Object.entries(themeStyles)) {
    styles[key] = styleFunction(theme);
  }

  return styles;
}