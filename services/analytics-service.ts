import {
  getAnalytics,
  logEvent,
  logAppOpen as firebaseLogAppOpen,
} from "@react-native-firebase/analytics";

export type DrawingMode = "virtual" | "ar";

const analytics = getAnalytics();

/**
 * Log when the app is opened.
 */
export const logAppOpen = async () => {
  try {
    await firebaseLogAppOpen(analytics);
  } catch (error) {
    console.warn("[Analytics] Failed to log app_open", error);
  }
};

/**
 * Log when a user starts a drawing session.
 * @param mode 'virtual' for screen drawing, 'ar' for camera-based drawing.
 */
export const logDrawingStarted = async (mode: DrawingMode) => {
  try {
    await logEvent(analytics, "drawing_started", {
      mode,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.warn("[Analytics] Failed to log drawing_started", error);
  }
};

/**
 * Log when a user completes a drawing.
 * This is the goal event (Conversion).
 * @param mode 'virtual' for screen drawing, 'ar' for camera-based drawing.
 */
export const logDrawingCompleted = async (mode: DrawingMode) => {
  try {
    await logEvent(analytics, "drawing_completed", {
      mode,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.warn("[Analytics] Failed to log drawing_completed", error);
  }
};

/**
 * Log when a user clicks on a premium feature or subscription modal.
 * @param location Where the user clicked from (e.g., 'home', 'settings', 'asset_modal').
 */
export const logPremiumClicked = async (location: string) => {
  try {
    await logEvent(analytics, "premium_clicked", {
      location,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.warn("[Analytics] Failed to log premium_clicked", error);
  }
};
