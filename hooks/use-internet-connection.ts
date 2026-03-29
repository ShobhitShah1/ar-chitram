import { useNetInfo } from "@react-native-community/netinfo";
import { useEffect, useRef } from "react";

interface InternetConnectionState {
  isConnected: boolean;
  isOffline: boolean;
  showOfflineModal: boolean;
  connectionType: string;
}

interface UseInternetConnectionOptions {
  /**
   * Whether to automatically show offline modal when connection is lost
   * @default true
   */
  showModalOnOffline?: boolean;
  /**
   * Callback when connection state changes
   */
  onConnectionChange?: (isConnected: boolean) => void;
  /**
   * Callback when connection is restored - for refreshing socket connections, etc.
   * Only fires when transitioning from offline to online (not on initial mount)
   */
  onConnectionRestored?: () => void | Promise<void>;
}

/**
 * Hook to monitor internet connection status using NetInfo's built-in useNetInfo hook
 * Properly handles connection state changes without triggering on every mount
 */
export function useInternetConnection(
  options: UseInternetConnectionOptions = {},
): InternetConnectionState {
  const {
    showModalOnOffline = true,
    onConnectionChange,
    onConnectionRestored,
  } = options;

  const netInfo = useNetInfo();
  const previousConnectionRef = useRef<boolean | null>(null);
  const hasInitializedRef = useRef(false);
  const callbackFiredRef = useRef(false);
  const wasDisconnectedRef = useRef(false);
  const restoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const isConnected = netInfo.isConnected !== false;
  const isOffline = netInfo.isConnected === false;
  const connectionType = netInfo.type || "unknown";

  const showOfflineModal =
    showModalOnOffline && isOffline && hasInitializedRef.current;

  useEffect(() => {
    const wasConnected = previousConnectionRef.current;

    if (!hasInitializedRef.current) {
      if (netInfo.isConnected !== null) {
        hasInitializedRef.current = true;
        previousConnectionRef.current = isConnected;
        callbackFiredRef.current = false;
      }
      return;
    }

    if (wasConnected === isConnected) {
      return;
    }

    if (!callbackFiredRef.current) {
      onConnectionChange?.(isConnected);

      if (!isConnected) {
        wasDisconnectedRef.current = true;
      }

      if (
        wasDisconnectedRef.current &&
        isConnected &&
        wasConnected === false &&
        onConnectionRestored
      ) {
        wasDisconnectedRef.current = false;

        if (restoreTimeoutRef.current) {
          clearTimeout(restoreTimeoutRef.current);
        }

        restoreTimeoutRef.current = setTimeout(() => {
          void onConnectionRestored();
        }, 500);
      }

      callbackFiredRef.current = true;

      if (callbackResetTimeoutRef.current) {
        clearTimeout(callbackResetTimeoutRef.current);
      }

      callbackResetTimeoutRef.current = setTimeout(() => {
        callbackFiredRef.current = false;
      }, 2000);
    }

    previousConnectionRef.current = isConnected;
  }, [
    isConnected,
    onConnectionChange,
    onConnectionRestored,
    netInfo.isConnected,
  ]);

  useEffect(() => {
    return () => {
      if (restoreTimeoutRef.current) {
        clearTimeout(restoreTimeoutRef.current);
      }

      if (callbackResetTimeoutRef.current) {
        clearTimeout(callbackResetTimeoutRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    isOffline,
    showOfflineModal,
    connectionType,
  };
}
