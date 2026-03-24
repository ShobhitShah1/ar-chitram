import { debugLog } from "@/constants/debug";
import mobileAds from "react-native-google-mobile-ads";

let initializePromise: Promise<void> | null = null;
let hasInitialized = false;

export const ensureMobileAdsInitialized = async (): Promise<void> => {
  if (!initializePromise) {
    debugLog.info("[Ads] Initializing Mobile Ads SDK");

    initializePromise = mobileAds()
      .initialize()
      .then((adapterStatuses) => {
        hasInitialized = true;
        debugLog.info("[Ads] Mobile Ads SDK initialized", {
          adapterCount: Object.keys(adapterStatuses ?? {}).length,
        });
      })
      .then(() => undefined)
      .catch((error) => {
        initializePromise = null;
        hasInitialized = false;
        debugLog.error("[Ads] Mobile Ads SDK initialization failed", error);
        throw error;
      });
  }

  return initializePromise;
};

export const hasMobileAdsInitialized = () => hasInitialized;
