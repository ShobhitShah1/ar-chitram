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
  options: UseInternetConnectionOptions = {}
): InternetConnectionState {
  const {
    showModalOnOffline = true,
    onConnectionChange,
    onConnectionRestored,
  } = options;

  // Use NetInfo's official React hook
  const netInfo = useNetInfo();

  // Track previous connection state to detect actual transitions
  const previousConnectionRef = useRef<boolean | null>(null);
  const hasInitializedRef = useRef(false);
  const callbackFiredRef = useRef(false);
  const wasDisconnectedRef = useRef(false);

  // Derive values from NetInfo state
  // NetInfo returns null initially, so treat null as connected to avoid false offline state
  const isConnected = netInfo.isConnected !== false;
  const isOffline = netInfo.isConnected === false;
  const connectionType = netInfo.type || "unknown";

  // Only show modal when offline and after initialization
  const showOfflineModal =
    showModalOnOffline && isOffline && hasInitializedRef.current;

  // Handle connection state changes
  useEffect(() => {
    const wasConnected = previousConnectionRef.current;

    // First run - just initialize without calling callbacks
    // Wait for actual connection state (not null)
    if (!hasInitializedRef.current) {
      // Only initialize when we have actual state (not null)
      if (netInfo.isConnected !== null) {
        hasInitializedRef.current = true;
        previousConnectionRef.current = isConnected;
        callbackFiredRef.current = false;
        console.log("Internet hook initialized:", isConnected ? "ONLINE" : "OFFLINE");
      }
      return;
    }

    // No state change - skip
    if (wasConnected === isConnected) {
      return;
    }

    // State changed - only call callback once per transition
    if (!callbackFiredRef.current) {
      console.log("Connection state changed:", 
        wasConnected ? "ONLINE→OFFLINE" : "OFFLINE→ONLINE"
      );
      
      onConnectionChange?.(isConnected);
      
      // Track disconnection
      if (!isConnected) {
        wasDisconnectedRef.current = true;
      }
      
      // Call restoration callback ONLY when:
      // 1. We were previously offline (wasDisconnectedRef is true)
      // 2. We're now online (isConnected is true)
      // 3. Previous state was explicitly false (actual transition)
      if (
        wasDisconnectedRef.current &&
        isConnected &&
        wasConnected === false &&
        onConnectionRestored
      ) {
        console.log("Calling onConnectionRestored");
        wasDisconnectedRef.current = false; // Reset flag
        
        // Small delay to ensure state is stable
        setTimeout(() => {
          onConnectionRestored();
        }, 500);
      }
      
      callbackFiredRef.current = true;

      // Reset the flag after a short delay to allow for next transition
      setTimeout(() => {
        callbackFiredRef.current = false;
      }, 2000);
    }

    // Update previous state
    previousConnectionRef.current = isConnected;
  }, [isConnected, onConnectionChange, netInfo.isConnected]);

  return {
    isConnected,
    isOffline,
    showOfflineModal,
    connectionType,
  };
}