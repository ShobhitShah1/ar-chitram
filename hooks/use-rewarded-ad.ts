import {
  getRewardedAdSnapshot,
  preloadRewardedAds,
  reloadRewardedAds,
  showRewardedAd,
  subscribeRewardedAdSnapshot,
} from "@/services/rewarded-ad-service";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import type { RewardedAdReward } from "react-native-google-mobile-ads";

interface UseRewardedAdOptions {
  autoPreload?: boolean;
  onRewardEarned?: (reward: { type: string; amount: number }) => void;
  onAdClosed?: () => void;
  onAdError?: (error: Error) => void;
  onAdBlockerDetected?: () => void;
}

export const useOptimizedRewardedAd = (options: UseRewardedAdOptions = {}) => {
  const {
    autoPreload = true,
    onRewardEarned,
    onAdClosed,
    onAdError,
    onAdBlockerDetected,
  } = options;

  const [snapshot, setSnapshot] = useState(() => getRewardedAdSnapshot());
  const callbacksRef = useRef({
    onRewardEarned,
    onAdClosed,
    onAdError,
    onAdBlockerDetected,
  });
  const hasReportedBlockerRef = useRef(false);

  callbacksRef.current = {
    onRewardEarned,
    onAdClosed,
    onAdError,
    onAdBlockerDetected,
  };

  useEffect(() => {
    const unsubscribe = subscribeRewardedAdSnapshot(() => {
      setSnapshot(getRewardedAdSnapshot());
    });

    if (autoPreload) {
      void preloadRewardedAds("hook-mount");
    }

    return unsubscribe;
  }, [autoPreload]);

  useEffect(() => {
    if (!snapshot.adBlockerDetected || hasReportedBlockerRef.current) {
      return;
    }

    hasReportedBlockerRef.current = true;
    callbacksRef.current.onAdBlockerDetected?.();
  }, [snapshot.adBlockerDetected]);

  useEffect(() => {
    if (!snapshot.adBlockerDetected) {
      hasReportedBlockerRef.current = false;
    }
  }, [snapshot.adBlockerDetected]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void preloadRewardedAds("app-active");
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const showAd = useCallback(() => {
    return showRewardedAd({
      onRewardEarned: (reward: RewardedAdReward) => {
        callbacksRef.current.onRewardEarned?.(reward);
      },
      onClosed: () => {
        callbacksRef.current.onAdClosed?.();
      },
      onError: (error: Error) => {
        callbacksRef.current.onAdError?.(error);
      },
    });
  }, []);

  const reloadAd = useCallback(() => {
    reloadRewardedAds("manual-reload");
  }, []);

  return {
    isLoaded: snapshot.readyCount > 0,
    isLoading:
      snapshot.readyCount === 0 &&
      (snapshot.isInitializing || snapshot.loadingCount > 0),
    isShowing: snapshot.isShowing,
    isEarnedReward: false,
    error: snapshot.lastError,
    reward: null,
    adBlockerDetected: snapshot.adBlockerDetected,
    consecutiveFailures: snapshot.consecutiveFailures,
    showAd,
    reloadAd,
    isOpened: snapshot.isShowing,
    isClosed: !snapshot.isShowing,
  };
};
