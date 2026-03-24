import { AdConfig } from "@/constants/ad-config";
import { debugLog } from "@/constants/debug";
import { ensureMobileAdsInitialized } from "@/services/mobile-ads-service";
import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
  type RewardedAdReward,
} from "react-native-google-mobile-ads";

type RewardedAdSlotKey = "primary" | "secondary";
type RewardedAdSlotStatus = "idle" | "loading" | "loaded" | "showing" | "error";

type RewardedAdShowCallbacks = {
  onRewardEarned?: (reward: RewardedAdReward) => void;
  onClosed?: () => void;
  onError?: (error: Error) => void;
};

type RewardedAdSnapshot = {
  isInitialized: boolean;
  isInitializing: boolean;
  isShowing: boolean;
  readyCount: number;
  loadingCount: number;
  lastError: Error | null;
  consecutiveFailures: number;
  adBlockerDetected: boolean;
  configIssue: string | null;
};

interface RewardedAdSlot {
  key: RewardedAdSlotKey;
  ad: RewardedAd;
  status: RewardedAdSlotStatus;
  reward: RewardedAdReward | null;
  lastError: Error | null;
  retryTimeout: ReturnType<typeof setTimeout> | null;
  retryAttempt: number;
  activeCallbacks: RewardedAdShowCallbacks | null;
  rewardDelivered: boolean;
}

const SLOT_KEYS: RewardedAdSlotKey[] = ["primary", "secondary"];
const AD_BLOCKER_THRESHOLD = 5;
const TRANSIENT_ERROR_CODES = new Set([
  "error-code-no-fill",
  "error-code-network-error",
  "error-code-internal-error",
  "error-code-request-id-mismatch",
  "error-code-timeout",
  "no-fill",
  "network-error",
  "internal-error",
  "timeout",
]);

const toError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error));

const getErrorCode = (error: unknown) => {
  const code = (error as { code?: string })?.code;
  return typeof code === "string" ? code.toLowerCase() : "";
};

const isTransientError = (error: unknown) => {
  const code = getErrorCode(error);
  return (
    TRANSIENT_ERROR_CODES.has(code) ||
    code.includes("no-fill") ||
    code.includes("network") ||
    code.includes("timeout")
  );
};

class RewardedAdService {
  private slots = new Map<RewardedAdSlotKey, RewardedAdSlot>();
  private listeners = new Set<() => void>();
  private initializePromise: Promise<void> | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private lastError: Error | null = null;
  private consecutiveFailures = 0;
  private adBlockerDetected = false;
  private invalidConfigLogged = false;

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): RewardedAdSnapshot {
    const slotValues = Array.from(this.slots.values());
    const readyCount = slotValues.filter(
      (slot) => slot.status === "loaded",
    ).length;
    const loadingCount = slotValues.filter(
      (slot) => slot.status === "loading",
    ).length;
    const isShowing = slotValues.some((slot) => slot.status === "showing");

    return {
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing,
      isShowing,
      readyCount,
      loadingCount,
      lastError: this.lastError,
      consecutiveFailures: this.consecutiveFailures,
      adBlockerDetected: this.adBlockerDetected,
      configIssue: AdConfig.rewardedAdUnitIdIssue,
    };
  }

  async warmup(reason = "manual") {
    if (!AdConfig.isRewardedAdUnitIdConfigured()) {
      const nextError = new Error(
        AdConfig.rewardedAdUnitIdIssue || "Rewarded ad unit id is invalid.",
      );

      this.lastError = nextError;

      if (!this.invalidConfigLogged) {
        this.invalidConfigLogged = true;
        debugLog.error("[Ads] Rewarded ads disabled by configuration", {
          configuredRewardedAdUnitId: AdConfig.configuredRewardedAdUnitId,
          issue: AdConfig.rewardedAdUnitIdIssue,
        });
      }

      this.emit();
      return false;
    }

    await this.ensureInitialized(reason);
    this.ensureWarmSlots(reason);
    return true;
  }

  show(callbacks: RewardedAdShowCallbacks = {}) {
    const loadedSlot = this.getLoadedSlot();

    if (!loadedSlot) {
      debugLog.warn("[Ads] Show requested without a ready rewarded ad", {
        readyCount: this.getSnapshot().readyCount,
        loadingCount: this.getSnapshot().loadingCount,
      });
      void this.warmup("show-without-ready-ad");
      return false;
    }

    try {
      loadedSlot.activeCallbacks = callbacks;
      loadedSlot.rewardDelivered = false;
      loadedSlot.status = "showing";
      this.emit();

      debugLog.info("[Ads] Showing rewarded ad", {
        slot: loadedSlot.key,
        readyCountBeforeShow: this.getSnapshot().readyCount,
      });

      loadedSlot.ad.show();
      this.ensureWarmSlots(`show:${loadedSlot.key}`);
      return true;
    } catch (showError) {
      const nextError = toError(showError);

      loadedSlot.status = "error";
      loadedSlot.lastError = nextError;
      loadedSlot.activeCallbacks = null;
      loadedSlot.rewardDelivered = false;
      this.lastError = nextError;

      debugLog.error("[Ads] Failed to show rewarded ad", {
        slot: loadedSlot.key,
        error: nextError.message,
        code: getErrorCode(nextError),
      });

      callbacks.onError?.(nextError);
      this.scheduleRetry(loadedSlot, "show-error");
      this.emit();
      return false;
    }
  }

  reload(reason = "manual-reload") {
    for (const slot of this.slots.values()) {
      this.clearRetry(slot);
      if (slot.status !== "showing") {
        slot.status = "idle";
      }
    }

    void this.warmup(reason);
  }

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private async ensureInitialized(reason: string) {
    if (this.isInitialized) {
      return;
    }

    if (this.initializePromise) {
      return this.initializePromise;
    }

    this.isInitializing = true;
    this.emit();

    this.initializePromise = (async () => {
      debugLog.info("[Ads] Preparing rewarded ad service", { reason });
      await ensureMobileAdsInitialized();

      for (const key of SLOT_KEYS) {
        if (!this.slots.has(key)) {
          this.slots.set(key, this.createSlot(key));
        }
      }

      this.isInitialized = true;
      this.lastError = null;
      debugLog.info("[Ads] Rewarded ad service ready");
    })()
      .catch((error) => {
        const nextError = toError(error);
        this.lastError = nextError;
        debugLog.error(
          "[Ads] Rewarded ad service initialization failed",
          nextError,
        );
        throw nextError;
      })
      .finally(() => {
        this.isInitializing = false;
        this.initializePromise = null;
        this.emit();
      });

    return this.initializePromise;
  }

  private createSlot(key: RewardedAdSlotKey): RewardedAdSlot {
    const ad = RewardedAd.createForAdRequest(AdConfig.rewardedAdUnitId, {
      requestNonPersonalizedAdsOnly: true,
      keywords: ["art", "drawing", "sketch", "premium"],
    });

    const slot: RewardedAdSlot = {
      key,
      ad,
      status: "idle",
      reward: null,
      lastError: null,
      retryTimeout: null,
      retryAttempt: 0,
      activeCallbacks: null,
      rewardDelivered: false,
    };

    ad.addAdEventsListener(({ type, payload }) => {
      this.handleSlotEvent(slot, type, payload);
    });

    return slot;
  }

  private handleSlotEvent(
    slot: RewardedAdSlot,
    type: AdEventType | RewardedAdEventType,
    payload: unknown,
  ) {
    switch (type) {
      case RewardedAdEventType.LOADED: {
        slot.status = "loaded";
        slot.reward = (payload as RewardedAdReward) ?? null;
        slot.lastError = null;
        slot.retryAttempt = 0;
        this.lastError = null;
        this.consecutiveFailures = 0;
        this.adBlockerDetected = false;

        debugLog.info("[Ads] Rewarded ad loaded", {
          slot: slot.key,
          readyCount: this.getSnapshot().readyCount + 1,
        });
        this.emit();
        return;
      }
      case RewardedAdEventType.EARNED_REWARD: {
        const reward = (payload as RewardedAdReward) ?? {
          amount: 1,
          type: "reward",
        };

        if (!slot.rewardDelivered) {
          slot.rewardDelivered = true;
          slot.activeCallbacks?.onRewardEarned?.(reward);
        }

        debugLog.info("[Ads] Reward earned", {
          slot: slot.key,
          amount: reward.amount,
          type: reward.type,
        });
        return;
      }
      case AdEventType.OPENED: {
        slot.status = "showing";
        debugLog.info("[Ads] Rewarded ad opened", { slot: slot.key });
        this.ensureWarmSlots(`opened:${slot.key}`);
        this.emit();
        return;
      }
      case AdEventType.CLOSED: {
        debugLog.info("[Ads] Rewarded ad closed", { slot: slot.key });
        slot.status = "idle";
        slot.reward = null;
        slot.lastError = null;
        slot.retryAttempt = 0;
        slot.rewardDelivered = false;
        slot.activeCallbacks?.onClosed?.();
        slot.activeCallbacks = null;
        this.emit();
        this.ensureWarmSlots(`closed:${slot.key}`);
        return;
      }
      case AdEventType.ERROR: {
        const nextError = toError(payload);
        const transient = isTransientError(nextError);

        slot.status = "error";
        slot.lastError = nextError;
        slot.reward = null;
        slot.rewardDelivered = false;
        this.lastError = nextError;
        this.consecutiveFailures += 1;

        if (!transient && this.consecutiveFailures >= AD_BLOCKER_THRESHOLD) {
          this.adBlockerDetected = true;
        }

        debugLog.warn("[Ads] Rewarded ad failed", {
          slot: slot.key,
          code: getErrorCode(nextError),
          message: nextError.message,
          transient,
          consecutiveFailures: this.consecutiveFailures,
        });

        slot.activeCallbacks?.onError?.(nextError);
        slot.activeCallbacks = null;

        this.scheduleRetry(slot, transient ? "transient-error" : "hard-error");
        this.emit();
        return;
      }
      default:
        return;
    }
  }

  private scheduleRetry(slot: RewardedAdSlot, reason: string) {
    this.clearRetry(slot);

    const delay = Math.min(2000 * Math.pow(2, slot.retryAttempt), 30000);
    slot.retryAttempt += 1;

    debugLog.info("[Ads] Scheduling rewarded ad reload", {
      slot: slot.key,
      reason,
      retryAttempt: slot.retryAttempt,
      delayMs: delay,
    });

    slot.retryTimeout = setTimeout(() => {
      slot.retryTimeout = null;
      this.loadSlot(slot, `retry:${reason}`);
    }, delay);
  }

  private clearRetry(slot: RewardedAdSlot) {
    if (slot.retryTimeout) {
      clearTimeout(slot.retryTimeout);
      slot.retryTimeout = null;
    }
  }

  private ensureWarmSlots(reason: string) {
    for (const key of SLOT_KEYS) {
      const slot = this.slots.get(key);
      if (!slot) {
        continue;
      }

      if (slot.status === "idle" || slot.status === "error") {
        this.loadSlot(slot, reason);
      }
    }
  }

  private loadSlot(slot: RewardedAdSlot, reason: string) {
    if (
      slot.status === "loading" ||
      slot.status === "loaded" ||
      slot.status === "showing"
    ) {
      return;
    }

    this.clearRetry(slot);
    slot.status = "loading";
    slot.lastError = null;

    debugLog.info("[Ads] Loading rewarded ad", {
      slot: slot.key,
      reason,
      adUnitId: AdConfig.rewardedAdUnitId,
    });

    this.emit();
    slot.ad.load();
  }

  private getLoadedSlot() {
    return Array.from(this.slots.values()).find(
      (slot) => slot.status === "loaded",
    );
  }
}

const rewardedAdService = new RewardedAdService();

export const subscribeRewardedAdSnapshot = (listener: () => void) =>
  rewardedAdService.subscribe(listener);

export const getRewardedAdSnapshot = () => rewardedAdService.getSnapshot();

export const preloadRewardedAds = (reason?: string) =>
  rewardedAdService.warmup(reason);

export const showRewardedAd = (callbacks?: RewardedAdShowCallbacks) =>
  rewardedAdService.show(callbacks);

export const reloadRewardedAds = (reason?: string) =>
  rewardedAdService.reload(reason);
