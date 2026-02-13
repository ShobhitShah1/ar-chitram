import {
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  useCommonThemedStyles,
  View,
} from "@/components/themed";
import { FontFamily } from "@/constants/fonts";
import { FACEBOOK_LINK, INSTAGRAM_LINK } from "@/constants/server";
import { useTheme } from "@/context/theme-context";
import { withTheme } from "@/context/theme-wrapper";
import { openAppForRating, shareAppWithFriends } from "@/utiles/app-utilities";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Linking,
  Pressable as RNPressable,
  StyleProp,
  StyleSheet,
  Switch,
  TextStyle,
} from "react-native";
import DeviceInfo from "react-native-device-info";
import Toast from "react-native-toast-message";

interface SettingsItemProps {
  title: string;
  onPress?: () => void;
  showArrow?: boolean;
  rightElement?: React.ReactNode;
  isLast?: boolean;
}

interface SocialIconProps {
  name: "logo-instagram" | "logo-facebook";
  color: string;
  onPress: () => void;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  title,
  onPress,
  showArrow = true,
  rightElement,
  isLast = false,
}) => {
  const { theme } = useTheme();

  return (
    <Pressable
      style={[
        styles.settingsItem,
        { backgroundColor: theme.cardBackground },
        // !isLast && {
        //   borderBottomWidth: 0.5,
        //   borderBottomColor: theme.borderPrimary,
        // },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.settingsItemText, { color: theme.textPrimary }]}>
        {title}
      </Text>
      <View style={styles.settingsItemRight}>
        {rightElement}
        {showArrow && !rightElement && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.textSecondary}
          />
        )}
      </View>
    </Pressable>
  );
};

const SocialIcon: React.FC<SocialIconProps> = ({ name, color, onPress }) => (
  <Pressable
    style={[styles.socialIcon, { backgroundColor: color }]}
    onPress={onPress}
  >
    <Ionicons name={name} size={20} color="white" />
  </Pressable>
);

const SectionHeader: React.FC<{
  title: string;
  style?: StyleProp<TextStyle>;
}> = ({ title, style }) => {
  const { theme } = useTheme();
  return (
    <Text style={[styles.sectionHeader, { color: theme.textPrimary }, style]}>
      {title}
    </Text>
  );
};

function SettingsScreen() {
  const router = useRouter();
  const { theme, setThemeMode, isDark } = useTheme();

  const commonStyles = useCommonThemedStyles();

  const openInstagram = () => {
    Linking.openURL(INSTAGRAM_LINK);
  };

  const openFacebook = () => {
    Linking.openURL(FACEBOOK_LINK);
  };

  const handleClearCache = () => {
    Alert.alert(
      "Remove Cache Storage",
      "This will remove all downloaded images but keep your favorite packs. You can re-download them later.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              Toast.show({
                type: "success",
                text1: "Storage Cleaned",
                text2: "All cached images deleted from phone storage",
              });
            } catch (error) {
              Toast.show({
                type: "error",
                text1: "Error",
                text2: "Failed to clear cache",
              });
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        style={styles.content}
      >
        <SectionHeader title="Preference" style={{ marginTop: 0 }} />
        <View style={[styles.section]}>
          <View
            style={[
              [styles.settingsItem, { backgroundColor: theme.cardBackground }],
            ]}
          >
            <Text
              style={[styles.settingsItemText, { color: theme.textPrimary }]}
            >
              Dark Theme
            </Text>
            <Switch
              value={isDark}
              onValueChange={(value) => setThemeMode(value ? "dark" : "light")}
              trackColor={{ false: "#E5E5E5", true: "#4CAF50" }}
              thumbColor={isDark ? "#fff" : "#fff"}
            />
          </View>
        </View>

        <SectionHeader title="Contact" />
        <View
          style={[styles.section, { backgroundColor: theme.cardBackground }]}
        >
          <SettingsItem
            title="Contact Us"
            onPress={() => Linking.openURL("mailto:gigglam01@gmail.com")}
          />
          <View
            style={[
              styles.settingsItem,
              { backgroundColor: theme.cardBackground },
            ]}
          >
            <Text
              style={[styles.settingsItemText, { color: theme.textPrimary }]}
            >
              Social Media
            </Text>
            <View style={styles.socialContainer}>
              <SocialIcon
                name="logo-instagram"
                color="#E4405F"
                onPress={openInstagram}
              />
              <SocialIcon
                name="logo-facebook"
                color="#1877F2"
                onPress={openFacebook}
              />
            </View>
          </View>
        </View>

        <SectionHeader title="Support" />
        <View
          style={[styles.section, { backgroundColor: theme.cardBackground }]}
        >
          <SettingsItem
            title="Rating And Review"
            onPress={() => openAppForRating()}
          />
          <SettingsItem
            title="Privacy Policy"
            onPress={() => router.push("/privacy-policy")}
          />
          <SettingsItem
            title="Terms of Use"
            onPress={() => router.push("/terms-of-use")}
          />
          <SettingsItem
            title="Open Source License"
            onPress={() => router.push("/open-source-license")}
            isLast={true}
          />
          <SettingsItem
            title="Share With Friends"
            onPress={shareAppWithFriends}
          />
        </View>

        <RNPressable onLongPress={handleClearCache}>
          <Text style={[styles.versionText, { color: theme.textSecondary }]}>
            Version {DeviceInfo.getVersion()}
          </Text>
        </RNPressable>
      </ScrollView>
    </SafeAreaView>
  );
}

export default withTheme(SettingsScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontFamily: FontFamily.semibold,
    marginTop: 25,
    marginBottom: 15,
  },
  section: {
    overflow: "hidden",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 13,
    overflow: "hidden",
  },
  settingsItemText: {
    fontSize: 16,
    fontFamily: FontFamily.medium,
  },
  settingsItemRight: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  languageText: {
    fontSize: 16,
    marginRight: 8,
  },
  socialContainer: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "transparent",
  },
  socialIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addPhoneButton: {
    borderRadius: 25,
    height: 55,
    marginTop: 30,
    marginBottom: 15,
    alignItems: "center",
  },
  addPhoneButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: FontFamily.semibold,
  },
  logoutButton: {
    backgroundColor: "#FF3B30",
    borderRadius: 25,
    paddingVertical: 16,
    marginBottom: 20,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: FontFamily.semibold,
  },
  versionText: {
    textAlign: "center",
    fontSize: 14,
    marginVertical: 20,
    fontFamily: FontFamily.semibold,
  },
});
