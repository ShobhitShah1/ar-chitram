import { BYPASS_OTP, debugLog } from "@/constants/debug";
import { apiQueryKeys } from "@/services/api/query-keys";
import {
  fetchAccounts,
  registerUser,
  setApiAuthToken,
} from "@/services/api-service";
import { useAuthStore } from "@/store/auth-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export const authQueryKeys = apiQueryKeys.auth;

/**
 * Utility function to check if user is properly authenticated
 * Returns both token and userId if available
 */
export const checkAuthStatus = async (): Promise<{
  isAuthenticated: boolean;
  token: string | null;
  userId: string | null;
}> => {
  try {
    const { accessToken, user } = useAuthStore.getState();
    const token = accessToken;
    const userId = user?.id || null;

    debugLog.info("🔍 Auth status check", {
      hasToken: !!token,
      hasUserId: !!userId,
      tokenLength: token?.length || 0,
    });

    return {
      isAuthenticated: !!(token && userId),
      token,
      userId,
    };
  } catch (error) {
    debugLog.error("Error checking auth status:", error);
    return {
      isAuthenticated: false,
      token: null,
      userId: null,
    };
  }
};

/**
 * Initialize API authentication from secure storage
 * Call this at app startup or when auth seems to be lost
 */
export const initializeApiAuth = async (): Promise<boolean> => {
  try {
    debugLog.info("Initializing API authentication");

    const authStatus = await checkAuthStatus();

    if (authStatus.isAuthenticated && authStatus.token) {
      // Set auth token for all API instances
      setApiAuthToken(authStatus.token);

      debugLog.info("API authentication initialized successfully", {
        hasToken: true,
        hasUserId: true,
      });

      return true;
    } else {
      debugLog.warn("Cannot initialize API auth - missing credentials", {
        hasToken: !!authStatus.token,
        hasUserId: !!authStatus.userId,
      });

      return false;
    }
  } catch (error) {
    debugLog.error("Failed to initialize API authentication", error);
    return false;
  }
};

/**
 * Hook to fetch accounts for a phone number
 * Uses React Query's caching and automatic refetching
 */
export const useFetchAccounts = (mobile: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: authQueryKeys.accounts(mobile),
    queryFn: () => fetchAccounts(mobile),
    enabled: enabled && !!mobile,
    staleTime: 2 * 60 * 1000, // 2 minutes - accounts don't change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
    retry: (failureCount, error: any) => {
      // Don't retry if it's a 404 (no accounts found)
      if (error?.response?.status === 404) return false;
      return failureCount < 2;
    },
  });
};

/**
 * Hook to register a new user
 * Automatically handles token storage, account fetching, and ID storage
 */
export const useRegisterUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      mobileNo: string,
    ): Promise<{ token: string; userId: string }> => {
      debugLog.info("Starting complete registration flow", {
        mobileNo,
        bypassOTP: BYPASS_OTP,
      });

      const registerResponse = await registerUser(mobileNo);

      if (registerResponse.code !== 200 || !registerResponse.data.token) {
        throw new Error(registerResponse.message || "Registration failed");
      }

      const token = registerResponse.data.token;

      const accountResponse = await fetchAccounts(mobileNo);

      if (accountResponse.code !== 200 || !accountResponse.data?.data?.length) {
        throw new Error("Failed to fetch user account after registration");
      }

      const userId = accountResponse.data.data[0]._id;

      return { token, userId };
    },
    onSuccess: async (data, mobileNo) => {
      try {
        useAuthStore.getState().setAuthSession({
          accessToken: data.token,
          user: {
            id: data.userId,
            name: null,
            email: null,
            photo: null,
          },
        });

        setApiAuthToken(data.token);

        debugLog.info("Complete registration flow successful", {
          mobileNo,
          hasToken: !!data.token,
          hasUserId: !!data.userId,
          userId: data.userId,
        });

        queryClient.invalidateQueries({ queryKey: authQueryKeys.user });
      } catch (error) {
        debugLog.error("Error storing registration data", error);
        throw error;
      }
    },
    onError: (error) => {
      debugLog.error("Complete registration flow error", error);
    },
  });
};

/**
 * Hook to ensure authentication is active and restore it if needed
 */
export const useEnsureAuth = () => {
  const restoreAuth = useCallback(async (): Promise<boolean> => {
    try {
      const authStatus = await checkAuthStatus();

      if (authStatus.isAuthenticated && authStatus.token) {
        // Auth is good, make sure API instances have the token
        setApiAuthToken(authStatus.token);
        return true;
      } else {
        debugLog.warn("Authentication not available", {
          hasToken: !!authStatus.token,
          hasUserId: !!authStatus.userId,
        });
        return false;
      }
    } catch (error) {
      debugLog.error("Error ensuring authentication", error);
      return false;
    }
  }, []);

  return {
    restoreAuth,
    checkAuthStatus,
  };
};

/**
 * Composite hook for the complete registration flow
 * Combines account fetching with registration logic
 */
export const useRegistrationFlow = () => {
  const registerMutation = useRegisterUser();

  const handleRegistration = async (mobileNo: string) => {
    return await registerMutation.mutateAsync(mobileNo);
  };

  return {
    handleRegistration,
    isLoading: registerMutation.isPending,
    error: registerMutation.error,
    isSuccess: registerMutation.isSuccess,
    data: registerMutation.data,
  };
};
