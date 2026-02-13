import { debugLog } from "@/constants/debug";
import { SERVER_URL } from "@/constants/server";
import { RoomInfo } from "@/types";
import { Platform } from "react-native";
import {
  ApiRequest,
  ApiResponse,
  FetchAccountsResponse,
  RegisterResponse,
  SendOTPResponse,
  VerifyOTPResponse,
} from "@/types/api";
import { getFromSecureStore } from "@/utiles/secure-storage";
import axios, { AxiosError, AxiosResponse } from "axios";
import NetInfo from "@react-native-community/netinfo";

// API Base URLs
const GIGGLAM_API_BASE = "https://nirvanatechlabs.in/gigglam/api";
const DATA_API_BASE = `${GIGGLAM_API_BASE}/data`;
const UPLOAD_API_BASE = GIGGLAM_API_BASE;

// Legacy API for room management
const api = axios.create({
  baseURL: SERVER_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Data API for authentication and general data operations
const dataApi = axios.create({
  baseURL: DATA_API_BASE,
  headers: {
    "Content-Type": "application/json",
    app_secret: "_g_i_g_g_l_a_m_",
  },
  timeout: 30000,
});

// Upload API for file uploads and contest operations
const uploadApi = axios.create({
  baseURL: UPLOAD_API_BASE,
  headers: {
    app_secret: "_g_i_g_g_l_a_m_",
  },
  timeout: 30000,
});

// Check internet before making requests
const checkInternetInterceptor = async (config: any) => {
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    return Promise.reject(new Error("No internet connection"));
  }
  return config;
};

// Add internet check to all API instances
dataApi.interceptors.request.use(checkInternetInterceptor);
uploadApi.interceptors.request.use(checkInternetInterceptor);
api.interceptors.request.use(checkInternetInterceptor);

// Request interceptor for uploadApi to automatically add auth tokens
uploadApi.interceptors.request.use(
  async (config) => {
    try {
      const token = await getFromSecureStore("userToken");
      const userId = await getFromSecureStore("userId");

      if (token && userId) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        debugLog.warn(
          "Missing authentication data, attempting to refresh from storage",
          {
            hasToken: !!token,
            hasUserId: !!userId,
          },
        );

        // Try to get fresh tokens from storage one more time
        const freshToken = await getFromSecureStore("userToken");
        const freshUserId = await getFromSecureStore("userId");

        if (freshToken && freshUserId) {
          debugLog.info("Found fresh tokens in storage, using them");
          config.headers.Authorization = `Bearer ${freshToken}`;
          // Also set the auth token for future requests
          dataApi.defaults.headers.common["Authorization"] =
            `Bearer ${freshToken}`;
          uploadApi.defaults.headers.common["Authorization"] =
            `Bearer ${freshToken}`;
        } else {
          debugLog.error("Authentication failed - no valid tokens found", {
            hasFreshToken: !!freshToken,
            hasFreshUserId: !!freshUserId,
          });
          return Promise.reject(
            new Error(
              `Authentication failed: ${
                !freshToken ? "token" : "userId"
              } is missing from secure storage`,
            ),
          );
        }
      }

      // Remove Content-Type for FormData requests to let axios set it automatically
      if (config.data instanceof FormData) {
        delete config.headers["Content-Type"];
      }
    } catch (error) {
      debugLog.error("Error getting auth token:", error);
      return Promise.reject(error);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor for uploadApi
uploadApi.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    debugLog.error("Upload API Error", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  },
);

// Custom error class for auth-skipped requests (not a real error, just skipped)
export class AuthSkippedError extends Error {
  public isAuthSkipped = true;
  constructor(eventName: string) {
    super(`Request skipped - user not authenticated: ${eventName}`);
    this.name = "AuthSkippedError";
  }
}

// Check if an error is an AuthSkippedError
export const isAuthSkipped = (error: any): boolean => {
  return error instanceof AuthSkippedError || error?.isAuthSkipped === true;
};

dataApi.interceptors.request.use(
  async (config) => {
    try {
      const token = await getFromSecureStore("userToken");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        // If no token is available, check if this is a request that requires auth
        const requiresAuth =
          config.data?.eventName &&
          ![
            "send_otp",
            "verify_otp",
            "app_user_register",
            "fetch_acc",
          ].includes(config.data.eventName);

        if (requiresAuth) {
          // Silently skip authenticated requests when user is not logged in
          // This prevents error logs and allows callers to handle gracefully
          return Promise.reject(new AuthSkippedError(config.data.eventName));
        }
      }
    } catch (error) {
      debugLog.error("Error getting auth token for data API:", error);
      return Promise.reject(error);
    }

    return config;
  },
  (error: AxiosError) => {
    debugLog.error("Data API Request Error", error);
    return Promise.reject(error);
  },
);

dataApi.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError | AuthSkippedError) => {
    // Skip logging for auth-skipped requests (user not logged in)
    if (isAuthSkipped(error)) {
      return Promise.reject(error);
    }

    const errorInfo = {
      message: error.message,
      status: (error as AxiosError).response?.status,
      statusText: (error as AxiosError).response?.statusText,
      data: (error as AxiosError).response?.data,
      config: {
        url: (error as AxiosError).config?.url,
        method: (error as AxiosError).config?.method,
        data: (error as AxiosError).config?.data,
      },
    };

    debugLog.error("API Response Error", errorInfo);

    if ((error as AxiosError).code === "ECONNABORTED") {
      debugLog.error("API Request Timeout", {
        timeout: (error as AxiosError).config?.timeout,
      });
    } else if ((error as AxiosError).code === "ERR_NETWORK") {
      debugLog.error("Network Error", {
        message: "No internet connection or server unreachable",
      });
    } else if ((error as AxiosError).response?.status === 401) {
      debugLog.warn("Authentication Error", {
        message: "Unauthorized - token may be expired",
      });
    } else if ((error as AxiosError).response?.status === 500) {
      debugLog.error("Server Error", { message: "Internal server error" });
    }

    return Promise.reject(error);
  },
);

/**
 * Sets authentication token for API requests
 * @param token - The JWT token for authenticated requests
 */
export const setApiAuthToken = (token: string) => {
  dataApi.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  uploadApi.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  // Clear auth cache since token changed
  authCache = null;
};

// Cache for authentication status to prevent redundant calls
let authCache: {
  timestamp: number;
  result: {
    success: boolean;
    hasToken: boolean;
    hasUserId: boolean;
    token?: string;
    userId?: string;
  };
} | null = null;

const AUTH_CACHE_DURATION = 30000; // 30 seconds

/**
 * Initialize authentication when app starts or when navigating to authenticated screens
 * Uses caching to prevent redundant calls within 30 seconds
 */
export const initializeAuth = async (
  forceRefresh = false,
): Promise<{
  success: boolean;
  hasToken: boolean;
  hasUserId: boolean;
  token?: string;
  userId?: string;
}> => {
  try {
    // Check cache first (unless forced refresh)
    const now = Date.now();
    if (
      !forceRefresh &&
      authCache &&
      now - authCache.timestamp < AUTH_CACHE_DURATION
    ) {
      return authCache.result;
    }

    const token = await getFromSecureStore("userToken");
    const userId = await getFromSecureStore("userId");

    const result = {
      success: !!(token && userId),
      hasToken: !!token,
      hasUserId: !!userId,
      token: token || undefined,
      userId: userId || undefined,
    };

    if (token && userId) {
      // Set the tokens globally for all API instances
      setApiAuthToken(token);
    } else {
      debugLog.warn("Authentication data incomplete - user needs to login", {
        missingToken: !token,
        missingUserId: !userId,
      });
    }

    // Update cache
    authCache = {
      timestamp: now,
      result,
    };

    return result;
  } catch (error) {
    const errorResult = { success: false, hasToken: false, hasUserId: false };

    authCache = {
      timestamp: Date.now(),
      result: errorResult,
    };

    return errorResult;
  }
};

/**
 * Clear authentication cache - useful when auth state changes
 */
export const clearAuthCache = () => {
  authCache = null;
};

/**
 * Legacy function - use initializeAuth instead
 * @deprecated Use initializeAuth for better functionality
 */
export const reinitializeAuth = async (): Promise<{
  success: boolean;
  hasToken: boolean;
  hasUserId: boolean;
}> => {
  const result = await initializeAuth(true); // Force refresh for legacy compatibility
  return {
    success: result.success,
    hasToken: result.hasToken,
    hasUserId: result.hasUserId,
  };
};

/**
 * Check if user is properly authenticated for API calls
 */
export const checkAuthStatus = async (): Promise<{
  isAuthenticated: boolean;
  hasToken: boolean;
  hasUserId: boolean;
  message: string;
}> => {
  try {
    const token = await getFromSecureStore("userToken");
    const userId = await getFromSecureStore("userId");

    const hasToken = !!token;
    const hasUserId = !!userId;
    const isAuthenticated = hasToken && hasUserId;

    let message = "";
    if (isAuthenticated) {
      message = "User is properly authenticated";
    } else if (!hasToken && !hasUserId) {
      message = "User needs to login - missing both token and userId";
    } else if (!hasToken) {
      message = "User needs to login - missing authentication token";
    } else if (!hasUserId) {
      message = "User needs to login - missing userId";
    }

    return { isAuthenticated, hasToken, hasUserId, message };
  } catch (error) {
    debugLog.error("Error checking auth status:", error);
    return {
      isAuthenticated: false,
      hasToken: false,
      hasUserId: false,
      message: "Error checking authentication status",
    };
  }
};

/**
 * Removes authentication token from API requests
 */
export const clearApiAuthToken = () => {
  delete dataApi.defaults.headers.common["Authorization"];
  delete uploadApi.defaults.headers.common["Authorization"];

  // Also clear from legacy API
  delete api.defaults.headers.common["Authorization"];

  // Clear auth cache when logging out
  clearAuthCache();
};

/**
 * Legacy: Sets device header for old API endpoints
 * @param deviceId - The unique ID of the user's device
 */
export const setApiDeviceHeader = (deviceId: string) => {
  api.defaults.headers.common["x-device-id"] = deviceId;
};

const handleApiError = (error: AxiosError, eventName: string): never => {
  const errorMessage =
    error.response?.data || error.message || "Unknown error occurred";
  const statusCode = error.response?.status || 0;

  const enhancedError = new Error(`API Error (${eventName}): ${errorMessage}`);
  (enhancedError as any).statusCode = statusCode;
  (enhancedError as any).eventName = eventName;
  (enhancedError as any).originalError = error;

  throw enhancedError;
};

export const makeApiRequest = async <T>(
  request: ApiRequest,
): Promise<ApiResponse<T>> => {
  try {
    const response = await dataApi.post<ApiResponse<T>>("", request);
    return response.data;
  } catch (error) {
    return handleApiError(error as AxiosError, request.eventName);
  }
};

export const fetchAccounts = async (
  mobile: string,
): Promise<ApiResponse<FetchAccountsResponse>> => {
  return makeApiRequest<FetchAccountsResponse>({
    eventName: "fetch_acc",
    mobiles: mobile,
  });
};

export const registerUser = async (
  mobileNo: string,
): Promise<ApiResponse<RegisterResponse>> => {
  return makeApiRequest<RegisterResponse>({
    eventName: "app_user_register",
    mobile_no: mobileNo,
  });
};

export const sendOTP = async (
  mobileNo: string,
): Promise<ApiResponse<SendOTPResponse>> => {
  return makeApiRequest<SendOTPResponse>({
    eventName: "send_otp",
    mobile_no: mobileNo,
  });
};

export const verifyOTP = async (
  mobileNo: string,
  otp: string,
): Promise<ApiResponse<VerifyOTPResponse>> => {
  return makeApiRequest<VerifyOTPResponse>({
    eventName: "verify_otp",
    mobile_no: mobileNo,
    otp: otp,
  });
};

export const getProfile = async (): Promise<ApiResponse<{
  name: string;
  profile_image: string | null;
  SKU?: (string | null)[];
}> | null> => {
  try {
    const response = await dataApi.post("", {
      eventName: "get_profile",
    });

    debugLog.info("[PAYMENT] Profile fetched raw:", response.data);

    return response.data;
  } catch (error) {
    debugLog.error("Error loading profile", error);
    throw error;
  }
};

export const addSkuToProfile = async (
  sku: string,
): Promise<ApiResponse<any>> => {
  debugLog.info(`[PAYMENT] Adding SKU to profile: ${sku}`);
  const response = await makeApiRequest({
    eventName: "app_user_inapp",
    SKU: sku,
  });
  debugLog.info(`[PAYMENT] Add SKU response:`, response);
  return response;
};

export const updateNotificationToken = async (
  notificationToken: string,
): Promise<ApiResponse<any>> => {
  try {
    const response = await dataApi.post("", {
      eventName: "update_notification_token",
      notification_token: notificationToken,
    });

    let responseData = response.data;

    if (typeof responseData === "string") {
      try {
        const fixed = responseData.replace(/data":([A-Za-z\s]+)/, 'data":"$1"');

        responseData = JSON.parse(fixed);
      } catch (err) {
        console.warn("Could not parse response:", responseData);
      }
    }

    return responseData;
  } catch (error) {
    debugLog.error("Error updating notification token", error);
    throw error;
  }
};

export const joinContest = async (
  imageUri: string,
  mobileNo: string,
): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const token = await getFromSecureStore("userToken");
    if (!token) {
      throw new Error("Authentication token is required");
    }

    const fileExtension = imageUri.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `contest_image_${Date.now()}.${fileExtension}`;
    const mimeType = `image/${
      fileExtension === "jpg" ? "jpeg" : fileExtension
    }`;

    const formData = new FormData();
    formData.append("eventName", "join_contest");
    formData.append("file_to", "contest_image");
    formData.append("file", {
      uri:
        Platform.OS === "android" ? imageUri : imageUri.replace("file://", ""),
      type: mimeType,
      name: fileName,
    } as any);
    formData.append("mobile_no", mobileNo);

    const response = await axios.post(
      "https://nirvanatechlabs.in/gigglam/api/upload",
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          app_secret: "_g_i_g_g_l_a_m_",
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return {
      success: true,
      message: response.data.message || "Successfully joined contest!",
      data: response.data,
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    const errorData = axiosError.response?.data as any;
    const statusCode = axiosError.response?.status || 0;
    const errorMessage =
      errorData?.message ||
      axiosError.message ||
      "Network error occurred while joining contest";

    return {
      success: false,
      message: errorMessage,
      data: { statusCode, error: errorData },
    };
  }
};

export const updateProfile = async (
  imageUri: string,
  name: string,
): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const token = await getFromSecureStore("userToken");
    if (!token) {
      throw new Error("Authentication token is required");
    }

    const fileExtension = imageUri.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `profile_image_${Date.now()}.${fileExtension}`;
    const mimeType = `image/${
      fileExtension === "jpg" ? "jpeg" : fileExtension
    }`;

    const formData = new FormData();
    formData.append("eventName", "update_profile");
    formData.append("file_to", "profile_image");
    formData.append("file", {
      uri:
        Platform.OS === "android" ? imageUri : imageUri.replace("file://", ""),
      type: mimeType,
      name: fileName,
    } as any);
    formData.append("name", name);

    const response = await axios.post(
      "https://nirvanatechlabs.in/gigglam/api/upload",
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          app_secret: "_g_i_g_g_l_a_m_",
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return {
      success: true,
      message: response.data.message || "Profile updated successfully!",
      data: response.data,
    };
  } catch (error: AxiosError | any) {
    const axiosError = error as AxiosError;
    const errorData = axiosError.response?.data as any;
    const statusCode = axiosError.response?.status || 0;
    const errorMessage =
      errorData?.message ||
      axiosError.message ||
      "Network error occurred while updating profile";

    return {
      success: false,
      message: errorMessage,
      data: { statusCode, error: errorData },
    };
  }
};

export const loadAssets = async (): Promise<ApiResponse<any> | null> => {
  try {
    const response = await dataApi.post("", {
      eventName: "load_assets",
    });

    return response.data;
  } catch (error) {
    debugLog.error("Error loading assets", error);
    throw error;
  }
};

export const likeAndDislike = async (
  contest_image_id?: string,
  isLiked: boolean = true,
): Promise<ApiResponse<any>> => {
  try {
    const value = isLiked ? 1 : 0;
    const response = await dataApi.post("", {
      eventName: "like_dislike",
      contest_image_id: contest_image_id,
      value: value,
    });

    return response.data;
  } catch (error) {
    debugLog.error("Error loading like:", error);
    throw error;
  }
};

export const getContestWinners = async (): Promise<{
  today: any[];
  last7days: any[];
}> => {
  try {
    const response = await dataApi.post("", {
      eventName: "contest_winner_list",
    });

    const contestData = response.data.data || {};

    return {
      today: contestData.today || [],
      last7days: contestData.last7days || [],
    };
  } catch (error) {
    debugLog.error("Error loading contest winners", error);
    throw error;
  }
};

export const fetchRooms = async (): Promise<RoomInfo[]> => {
  const response = await api.get<{ rooms: RoomInfo[] }>("/rooms");
  return response.data.rooms;
};

export const deleteRoom = async (roomId: string): Promise<void> => {
  await api.delete(`/room/${roomId}`);
};

export const updatePhoneNumber = async (
  userId: string,
  newPhoneNumber: string,
): Promise<ApiResponse> => {
  try {
    const response = await dataApi.post("", {
      eventName: "update_phone_no",
      user_id: userId,
      new_mobile_no: newPhoneNumber,
    });

    return response.data;
  } catch (error) {
    debugLog.error("Error updating phone number", error);
    if (error instanceof AxiosError) {
      throw new Error(
        error.response?.data?.message || "Failed to update phone number",
      );
    }
    throw error;
  }
};

// Legal Documents API
export interface LegalDocument {
  _id: string;
  title: string;
  content: string;
  version: string;
  updatedAt: string;
}

export const getPrivacyPolicy = async (): Promise<
  ApiResponse<LegalDocument>
> => {
  try {
    const response = await dataApi.post("", {
      eventName: "get_privacy_policy",
    });

    return response.data;
  } catch (error) {
    debugLog.error("Error fetching privacy policy", error);
    throw error;
  }
};

export const getTermsOfUse = async (): Promise<ApiResponse<LegalDocument>> => {
  try {
    const response = await dataApi.post("", {
      eventName: "get_terms_of_use",
    });

    return response.data;
  } catch (error) {
    debugLog.error("Error fetching terms of use", error);
    throw error;
  }
};

export const getLibraryLicense = async (): Promise<
  ApiResponse<LegalDocument>
> => {
  try {
    const response = await dataApi.post("", {
      eventName: "get_library_license",
    });

    return response.data;
  } catch (error) {
    debugLog.error("Error fetching library license", error);
    throw error;
  }
};

// Background Assets API
export interface BackgroundAssetsResponse {
  background_assets: string[];
}

export const getBackgroundAssets = async (): Promise<
  ApiResponse<BackgroundAssetsResponse>
> => {
  try {
    const response = await dataApi.post("", {
      eventName: "background_assets",
    });

    return response.data;
  } catch (error) {
    debugLog.error("Error fetching background assets", error);
    throw error;
  }
};
