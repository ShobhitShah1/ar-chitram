// Debug configuration
export const DEBUG_MODE = __DEV__; // Automatically enabled in development
export const ENABLE_API_LOGGING = false; // Can be toggled independently
export const BYPASS_OTP = true; // Temporarily bypass OTP for testing

// Debug levels
export enum DebugLevel {
  ERROR = "ERROR",
  WARN = "WARN",
  INFO = "INFO",
  DEBUG = "DEBUG",
}

// Debug logger
export const debugLog = {
  error: (message: string, data?: any) => {
    if (DEBUG_MODE) {
      console.error(`[${DebugLevel.ERROR}] ${message}`, data || "");
    }
  },
  warn: (message: string, data?: any) => {
    if (DEBUG_MODE) {
      console.warn(`[${DebugLevel.WARN}] ${message}`, data || "");
    }
  },
  info: (message: string, data?: any) => {
    if (DEBUG_MODE) {
      console.log(`[${DebugLevel.INFO}] ${message}`, data || "");
    }
  },
  debug: (message: string, data?: any) => {
    if (DEBUG_MODE) {
      console.debug(`[${DebugLevel.DEBUG}] ${message}`, data || "");
    }
  },
  api: (message: string, data?: any) => {
    if (DEBUG_MODE && ENABLE_API_LOGGING) {
    }
  },
};
