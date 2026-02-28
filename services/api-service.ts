import { debugLog } from "@/constants/debug";
import { SERVER_URL } from "@/constants/server";
import { getAuthToken, getAuthUserId } from "@/store/auth-store";
import {
  ApiDataFor,
  ApiEventName,
  ApiRequestFor,
  ApiResponse,
  FetchAccountsResponse,
  ProfileResponseData,
  RegisterResponse,
} from "@/types/api";
import axios, { AxiosError, AxiosInstance } from "axios";
import { Platform } from "react-native";

const APP_SECRET = "_a_r_c_h_i_t_r_a_m_";
const API_BASE_URL = "https://nirvanatechlabs.in/ar_chitram/api";
const DATA_API_URL = `${API_BASE_URL}/data`;
const UPLOAD_API_URL = `${API_BASE_URL}/upload`;

const AUTH_OPTIONAL_EVENTS = new Set<string>([
  "send_otp",
  "verify_otp",
  "app_user_register",
  "fetch_acc",
  "install",
]);

type AnyApiRequest = {
  eventName: string;
} & Record<string, unknown>;

type UnknownApiResponse = ApiResponse<Record<string, unknown>>;

const createDataClient = (): AxiosInstance =>
  axios.create({
    baseURL: DATA_API_URL,
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
      app_secret: APP_SECRET,
    },
  });

const createUploadClient = (): AxiosInstance =>
  axios.create({
    baseURL: UPLOAD_API_URL,
    timeout: 30000,
    headers: {
      app_secret: APP_SECRET,
    },
  });

const createLegacyClient = (): AxiosInstance =>
  axios.create({
    baseURL: SERVER_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

const dataApi = createDataClient();
const uploadApi = createUploadClient();
const legacyApi = createLegacyClient();

const shouldRequireAuth = (requestData?: unknown): boolean => {
  if (!requestData || typeof requestData !== "object") {
    return false;
  }

  const eventName =
    "eventName" in requestData
      ? String((requestData as AnyApiRequest).eventName || "")
      : "";
  return Boolean(eventName && !AUTH_OPTIONAL_EVENTS.has(eventName));
};

export class AuthSkippedError extends Error {
  public readonly isAuthSkipped = true;

  constructor(eventName: string) {
    super(`Request skipped because auth is missing: ${eventName}`);
    this.name = "AuthSkippedError";
  }
}

export const isAuthSkipped = (error: unknown): boolean =>
  error instanceof AuthSkippedError ||
  (typeof error === "object" &&
    error !== null &&
    "isAuthSkipped" in error &&
    Boolean((error as { isAuthSkipped?: boolean }).isAuthSkipped));

dataApi.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  }

  if (shouldRequireAuth(config.data)) {
    const eventName =
      config.data && typeof config.data === "object" && "eventName" in config.data
        ? String((config.data as AnyApiRequest).eventName || "")
        : "unknown";
    return Promise.reject(new AuthSkippedError(eventName));
  }

  return config;
});

uploadApi.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (!token) {
    return Promise.reject(new Error("Authentication token is required."));
  }

  config.headers.Authorization = `Bearer ${token}`;

  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});

const parseApiErrorMessage = (error: AxiosError): string => {
  const responseData = error.response?.data;

  if (typeof responseData === "string") {
    return responseData;
  }

  if (
    responseData &&
    typeof responseData === "object" &&
    "message" in responseData &&
    typeof (responseData as { message?: unknown }).message === "string"
  ) {
    return (responseData as { message: string }).message;
  }

  return error.message || "Unknown API error";
};

const parseBrokenJson = (rawPayload: string): unknown => {
  try {
    return JSON.parse(rawPayload);
  } catch {
    // Handle malformed responses like: {"code":200,"data":versip,"message":"success."}
    const fixedPayload = rawPayload.replace(
      /("data"\s*:\s*)([A-Za-z_][A-Za-z0-9_\s-]*)(\s*[,}])/,
      (_match, start, value, end) => `${start}"${String(value).trim()}"${end}`,
    );
    return JSON.parse(fixedPayload);
  }
};

const normalizeApiResponse = <TData>(payload: unknown): ApiResponse<TData> => {
  if (payload && typeof payload === "object" && "code" in payload && "message" in payload) {
    return payload as ApiResponse<TData>;
  }

  if (typeof payload === "string") {
    const parsed = parseBrokenJson(payload);
    if (parsed && typeof parsed === "object" && "code" in parsed && "message" in parsed) {
      return parsed as ApiResponse<TData>;
    }
  }

  throw new Error("Invalid API response format.");
};

const toApiError = (error: AxiosError, eventName: string): Error => {
  const message = parseApiErrorMessage(error);
  const enhancedError = new Error(`API Error (${eventName}): ${message}`);

  (enhancedError as Error & { statusCode?: number }).statusCode =
    error.response?.status;
  (enhancedError as Error & { eventName?: string }).eventName = eventName;
  (enhancedError as Error & { originalError?: AxiosError }).originalError =
    error;

  return enhancedError;
};

interface UploadApiResponse {
  message?: string;
  profile_image?: string;
  [key: string]: unknown;
}

export const setApiAuthToken = (token: string) => {
  dataApi.defaults.headers.common.Authorization = `Bearer ${token}`;
  uploadApi.defaults.headers.common.Authorization = `Bearer ${token}`;
};

export const clearApiAuthToken = () => {
  delete dataApi.defaults.headers.common.Authorization;
  delete uploadApi.defaults.headers.common.Authorization;
  delete legacyApi.defaults.headers.common.Authorization;
  clearAuthCache();
};

export const setApiDeviceHeader = (deviceId: string) => {
  legacyApi.defaults.headers.common["x-device-id"] = deviceId;
};

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

const AUTH_CACHE_DURATION = 30000;

export const initializeAuth = async (
  forceRefresh = false,
): Promise<{
  success: boolean;
  hasToken: boolean;
  hasUserId: boolean;
  token?: string;
  userId?: string;
}> => {
  const now = Date.now();

  if (
    !forceRefresh &&
    authCache &&
    now - authCache.timestamp < AUTH_CACHE_DURATION
  ) {
    return authCache.result;
  }

  const token = getAuthToken();
  const userId = getAuthUserId();
  const result = {
    success: Boolean(token && userId),
    hasToken: Boolean(token),
    hasUserId: Boolean(userId),
    token: token || undefined,
    userId: userId || undefined,
  };

  if (token) {
    setApiAuthToken(token);
  }

  authCache = {
    timestamp: now,
    result,
  };

  return result;
};

export const clearAuthCache = () => {
  authCache = null;
};

export const reinitializeAuth = async (): Promise<{
  success: boolean;
  hasToken: boolean;
  hasUserId: boolean;
}> => {
  const result = await initializeAuth(true);
  return {
    success: result.success,
    hasToken: result.hasToken,
    hasUserId: result.hasUserId,
  };
};

export const checkAuthStatus = async (): Promise<{
  isAuthenticated: boolean;
  hasToken: boolean;
  hasUserId: boolean;
  message: string;
}> => {
  const token = getAuthToken();
  const userId = getAuthUserId();

  const hasToken = Boolean(token);
  const hasUserId = Boolean(userId);
  const isAuthenticated = hasToken && hasUserId;

  if (isAuthenticated) {
    return {
      isAuthenticated: true,
      hasToken,
      hasUserId,
      message: "User is authenticated.",
    };
  }

  if (!hasToken && !hasUserId) {
    return {
      isAuthenticated: false,
      hasToken: false,
      hasUserId: false,
      message: "Missing token and user id.",
    };
  }

  if (!hasToken) {
    return {
      isAuthenticated: false,
      hasToken: false,
      hasUserId: true,
      message: "Missing token.",
    };
  }

  return {
    isAuthenticated: false,
    hasToken: true,
    hasUserId: false,
    message: "Missing user id.",
  };
};

export async function makeApiRequest<TEvent extends ApiEventName>(
  request: ApiRequestFor<TEvent>,
): Promise<ApiResponse<ApiDataFor<TEvent>>>;
export async function makeApiRequest(
  request: AnyApiRequest,
): Promise<UnknownApiResponse>;
export async function makeApiRequest(
  request: AnyApiRequest,
): Promise<UnknownApiResponse> {
  try {
    const response = await dataApi.post<unknown>(
      "",
      request,
    );
    return normalizeApiResponse(response.data);
  } catch (error) {
    if (isAuthSkipped(error)) {
      throw error;
    }

    throw toApiError(error as AxiosError, request.eventName);
  }
}

export const fetchAccounts = async (
  mobile: string,
): Promise<ApiResponse<FetchAccountsResponse>> =>
  makeApiRequest<"fetch_acc">({
    eventName: "fetch_acc",
    mobiles: mobile,
  });

export const registerUser = async (
  mobileNo: string,
): Promise<ApiResponse<RegisterResponse>> =>
  makeApiRequest<"app_user_register">({
    eventName: "app_user_register",
    mobile_no: mobileNo,
  });

export const registerUserWithEmail = async (
  email: string,
): Promise<ApiResponse<RegisterResponse>> =>
  makeApiRequest<"app_user_register">({
    eventName: "app_user_register",
    email_id: email,
  });

export const getProfile = async (): Promise<ApiResponse<ProfileResponseData>> =>
  makeApiRequest<"get_profile">({
    eventName: "get_profile",
  });

export const addSkuToProfile = async (
  sku: string,
): Promise<ApiResponse<ApiDataFor<"app_user_inapp">>> =>
  makeApiRequest<"app_user_inapp">({
    eventName: "app_user_inapp",
    SKU: sku,
  });

export const updateNotificationToken = async (
  notificationToken: string,
): Promise<ApiResponse<Record<string, unknown> | string>> =>
  makeApiRequest<"update_notification_token">({
    eventName: "update_notification_token",
    notification_token: notificationToken,
  });

const buildUploadFormData = (
  eventName: "join_contest" | "update_profile",
  fileTo: "contest_image" | "profile_image",
  imageUri: string,
  fileNamePrefix: string,
  extraFields: Record<string, string>,
): FormData => {
  const fileExtension = imageUri.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `${fileNamePrefix}_${Date.now()}.${fileExtension}`;
  const mimeType = `image/${fileExtension === "jpg" ? "jpeg" : fileExtension}`;

  const formData = new FormData();
  formData.append("eventName", eventName);
  formData.append("file_to", fileTo);
  formData.append("file", {
    uri: Platform.OS === "android" ? imageUri : imageUri.replace("file://", ""),
    type: mimeType,
    name: fileName,
  } as never);

  Object.entries(extraFields).forEach(([field, value]) => {
    formData.append(field, value);
  });

  return formData;
};

export const joinContest = async (
  imageUri: string,
  mobileNo: string,
): Promise<{ success: boolean; message: string; data?: UploadApiResponse }> => {
  try {
    const formData = buildUploadFormData(
      "join_contest",
      "contest_image",
      imageUri,
      "contest_image",
      { mobile_no: mobileNo },
    );

    const response = await uploadApi.post<UploadApiResponse>("", formData);
    return {
      success: true,
      message: response.data?.message || "Successfully joined contest.",
      data: response.data,
    };
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return {
      success: false,
      message:
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Unable to join contest.",
      data: axiosError.response?.data,
    };
  }
};

export const updateProfile = async (
  imageUri: string,
  name: string,
): Promise<{ success: boolean; message: string; data?: UploadApiResponse }> => {
  try {
    const formData = buildUploadFormData(
      "update_profile",
      "profile_image",
      imageUri,
      "profile_image",
      { name },
    );

    const response = await uploadApi.post<UploadApiResponse>("", formData);
    return {
      success: true,
      message: response.data?.message || "Profile updated successfully.",
      data: response.data,
    };
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return {
      success: false,
      message:
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Unable to update profile.",
      data: axiosError.response?.data,
    };
  }
};

export const loadAssets = async (): Promise<
  ApiResponse<ApiDataFor<"load_assets">>
> =>
  makeApiRequest<"load_assets">({
    eventName: "load_assets",
  });

export const likeAndDislike = async (
  contest_image_id: string | undefined,
  isLiked = true,
): Promise<ApiResponse<ApiDataFor<"liked">>> => {
  const value = isLiked ? 1 : 0;

  try {
    return await makeApiRequest<"liked">({
      eventName: "liked",
      contest_image_id,
      value,
    });
  } catch (error) {
    // Backward compatibility for deployments still expecting "like_dislike".
    return makeApiRequest<"like_dislike">({
      eventName: "like_dislike",
      contest_image_id,
      value,
    });
  }
};

export const getContestWinners = async (): Promise<{
  today: ApiDataFor<"contest_winner_list">["today"];
  last7days: ApiDataFor<"contest_winner_list">["last7days"];
}> => {
  const response = await makeApiRequest<"contest_winner_list">({
    eventName: "contest_winner_list",
  });
  const contestData = response.data;

  return {
    today: Array.isArray(contestData.today) ? contestData.today : [],
    last7days: Array.isArray(contestData.last7days)
      ? contestData.last7days
      : [],
  };
};

export const getContestWinning = async (): Promise<
  ApiDataFor<"get_contest_winning">["win_results"]
> => {
  const response = await makeApiRequest<"get_contest_winning">({
    eventName: "get_contest_winning",
  });

  const winResults = response.data?.win_results;
  return Array.isArray(winResults) ? winResults : [];
};

export type LegalDocument = ApiDataFor<"get_privacy_policy">;

export const getPrivacyPolicy = async (): Promise<ApiResponse<LegalDocument>> =>
  makeApiRequest<"get_privacy_policy">({
    eventName: "get_privacy_policy",
  });

export const getTermsOfUse = async (): Promise<ApiResponse<LegalDocument>> =>
  makeApiRequest<"get_terms_of_use">({
    eventName: "get_terms_of_use",
  });

export const getLibraryLicense = async (): Promise<ApiResponse<LegalDocument>> =>
  makeApiRequest<"get_library_license">({
    eventName: "get_library_license",
  });

dataApi.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (!isAuthSkipped(error)) {
      debugLog.error("Data API request failed", {
        message: error.message,
        status: error.response?.status,
      });
    }
    return Promise.reject(error);
  },
);
