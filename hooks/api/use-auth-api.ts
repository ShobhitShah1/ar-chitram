import { BYPASS_OTP, debugLog } from "@/constants/debug";
import {
  fetchAccounts,
  registerUser,
  sendOTP,
  setApiAuthToken,
  verifyOTP,
  updatePhoneNumber,
} from "@/services/api-service";
import {
  ApiResponse,
  RegisterResponse,
  SendOTPResponse,
  VerifyOTPResponse,
} from "@/types/api";
import { saveToSecureStore, getFromSecureStore } from "@/utiles/secure-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

// Query keys for caching
export const authQueryKeys = {
  accounts: (mobile: string) => ["accounts", mobile] as const,
  user: ["user"] as const,
} as const;

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
    const token = await getFromSecureStore("userToken");
    const userId = await getFromSecureStore("userId");

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

      // Step 1: Register user and get token
      const registerResponse = await registerUser(mobileNo);

      if (registerResponse.code !== 200 || !registerResponse.data.token) {
        throw new Error(registerResponse.message || "Registration failed");
      }

      const token = registerResponse.data.token;
      debugLog.info("Registration successful, got token");

      // Step 2: Fetch account to get user ID
      debugLog.info("🔍 Fetching account to get user ID");
      const accountResponse = await fetchAccounts(mobileNo);

      if (accountResponse.code !== 200 || !accountResponse.data?.data?.length) {
        throw new Error("Failed to fetch user account after registration");
      }

      const userId = accountResponse.data.data[0]._id;
      debugLog.info("Account fetched successfully", { userId });

      return { token, userId };
    },
    onSuccess: async (data, mobileNo) => {
      try {
        // Store token and user ID securely
        await saveToSecureStore("userToken", data.token);
        await saveToSecureStore("userId", data.userId);

        // Set auth token for API requests
        setApiAuthToken(data.token);

        debugLog.info("Complete registration flow successful", {
          mobileNo,
          hasToken: !!data.token,
          hasUserId: !!data.userId,
          userId: data.userId,
        });

        // Invalidate and refetch user-related queries
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
 * Hook to send OTP
 * Note: Currently bypassed but preserved for future use
 */
export const useSendOTP = () => {
  return useMutation({
    mutationFn: async (
      mobileNo: string,
    ): Promise<ApiResponse<SendOTPResponse>> => {
      if (BYPASS_OTP) {
        debugLog.info("OTP sending bypassed");
        // Return a mock success response
        return {
          code: 200,
          data: { success: true, message: "OTP bypassed for testing" },
          message: "OTP sent successfully (bypassed)",
        };
      }

      debugLog.info("📱 Sending OTP", { mobileNo });
      return await sendOTP(mobileNo);
    },
    onSuccess: (data, mobileNo) => {
      debugLog.info("OTP sent successfully", {
        mobileNo,
        bypassed: BYPASS_OTP,
      });
    },
    onError: (error) => {
      debugLog.error("OTP sending error", error);
    },
  });
};

/**
 * Hook to verify OTP
 * Note: Currently bypassed but preserved for future use
 */
export const useVerifyOTP = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mobileNo,
      otp,
    }: {
      mobileNo: string;
      otp: string;
    }): Promise<ApiResponse<VerifyOTPResponse>> => {
      if (BYPASS_OTP) {
        debugLog.info("OTP verification bypassed", { mobileNo, otp });
        // Return a mock success response that will trigger registration
        return {
          code: 200,
          data: {
            success: true,
            token: "bypassed",
            message: "OTP bypassed for testing",
          },
          message: "OTP verified successfully (bypassed)",
        };
      }

      debugLog.info("🔐 Verifying OTP", {
        mobileNo,
        otp: otp.replace(/./g, "*"),
      });
      return await verifyOTP(mobileNo, otp);
    },
    onSuccess: async (data, { mobileNo, otp }) => {
      debugLog.info("OTP verified successfully", {
        mobileNo,
        bypassed: BYPASS_OTP,
      });

      // Invalidate user queries after successful verification
      queryClient.invalidateQueries({ queryKey: authQueryKeys.user });
    },
    onError: (error) => {
      debugLog.error("OTP verification error", error);
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
  const sendOTPMutation = useSendOTP();

  const handleRegistration = async (mobileNo: string) => {
    if (BYPASS_OTP) {
      // Direct registration bypass
      return await registerMutation.mutateAsync(mobileNo);
    } else {
      // Normal flow: send OTP first, then registration happens in OTP verification
      await sendOTPMutation.mutateAsync(mobileNo);
      return null; // OTP screen will handle the rest
    }
  };

  return {
    handleRegistration,
    isLoading: registerMutation.isPending || sendOTPMutation.isPending,
    error: registerMutation.error || sendOTPMutation.error,
    isSuccess: registerMutation.isSuccess,
    data: registerMutation.data,
  };
};

/**
 * Hook to update user phone number
 */
export const useUpdatePhoneNumber = () => {
  return useMutation({
    mutationFn: async ({
      userId,
      newPhoneNumber,
    }: {
      userId: string;
      newPhoneNumber: string;
    }) => {
      debugLog.info("📞 Updating phone number", { userId, newPhoneNumber });
      return await updatePhoneNumber(userId, newPhoneNumber);
    },
    onSuccess: (data, variables) => {
      debugLog.info("Phone number updated successfully", {
        userId: variables.userId,
        newPhoneNumber: variables.newPhoneNumber,
        response: data,
      });
    },
    onError: (error, variables) => {
      debugLog.error("Failed to update phone number", {
        error,
        userId: variables.userId,
        newPhoneNumber: variables.newPhoneNumber,
      });
    },
  });
};
