import Constants from "expo-constants";
import { Platform } from "react-native";
import { TestIds } from "react-native-google-mobile-ads";

type AdConfigExtra = {
  rewardedAdUnitIdAndroid?: string;
  rewardedAdUnitIdIos?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as AdConfigExtra;

const productionRewardedAdId =
  Platform.select({
    android: extra.rewardedAdUnitIdAndroid,
    ios: extra.rewardedAdUnitIdIos,
  }) || "";

const normalizeId = (id?: string | null) => id?.trim() ?? "";

const isRewardedAdUnitId = (id: string) =>
  /^ca-app-pub-\d+\/\d+$/.test(normalizeId(id));

const isAdMobAppId = (id: string) =>
  /^ca-app-pub-\d+~\d+$/.test(normalizeId(id));

const configuredRewardedAdUnitId = normalizeId(productionRewardedAdId);
const rewardedAdUnitIdIssue = !configuredRewardedAdUnitId
  ? "Missing rewarded ad unit id."
  : isAdMobAppId(configuredRewardedAdUnitId)
    ? "Configured rewarded ad id looks like an AdMob app id. Use a rewarded ad unit id with '/'."
    : !isRewardedAdUnitId(configuredRewardedAdUnitId)
      ? "Configured rewarded ad id is invalid."
      : null;

export const AdConfig = {
  isTestEnv: __DEV__,
  configuredRewardedAdUnitId: configuredRewardedAdUnitId || null,
  rewardedAdUnitIdIssue,
  hasValidProductionRewardedAdUnitId:
    rewardedAdUnitIdIssue === null && !__DEV__,
  rewardedAdUnitId: __DEV__ ? TestIds.REWARDED : configuredRewardedAdUnitId,
  isRewardedAdUnitIdConfigured() {
    return __DEV__ || rewardedAdUnitIdIssue === null;
  },
  setRewardedAdUnitId(id: string) {
    if (id) {
      this.rewardedAdUnitId = id;
    }
  },
};
