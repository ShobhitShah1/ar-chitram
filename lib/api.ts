import { SERVER_URL } from "@/constants/server";
import { RoomInfo } from "@/types";
import { AuthResponse, LoginRequest, RegisterRequest } from "@/types/auth";
import {
  deleteFromSecureStore,
  getFromSecureStore,
  saveToSecureStore,
} from "@/utiles/secure-storage";
import axios, { AxiosError, AxiosResponse } from "axios";

export interface ApiError {
  msg: string;
  errors?: Record<string, string>;
}

// Create axios instance
export const api = axios.create({
  baseURL: SERVER_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getFromSecureStore("userToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const deviceId = await getFromSecureStore("deviceId");
      if (deviceId) {
        config.headers["x-device-id"] = deviceId;
      }
    } catch (error) {
      console.error("Error getting tokens from secure store:", error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiError>) => {
    if (error.response?.status === 500) {
      // Handle unauthorized - clear tokens and redirect to login
      await deleteFromSecureStore("userToken");
      await deleteFromSecureStore("user");
      // You can emit an event here to redirect to login screen
    }
    return Promise.reject(error);
  }
);

// Utility function to handle API errors
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError;
    return apiError?.msg || error.message || "An unexpected error occurred";
  }
  return "An unexpected error occurred";
};

// Auth API functions
export const authApi = {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/register/phone", data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/login/phone", data);

    if (response.data.token) {
      await saveToSecureStore("userToken", response.data.token);
    }

    if (response.data.user) {
      await saveToSecureStore("user", JSON.stringify(response.data.user));
    }

    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.get("/auth/logout");
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      // Always clear local tokens
      await deleteFromSecureStore("userToken");
      await deleteFromSecureStore("user");
    }
  },
};

// Rooms API functions
export const roomsApi = {
  fetchRooms: async (): Promise<RoomInfo[]> => {
    const response = await api.get<{ rooms: RoomInfo[] }>("/rooms");
    return response.data.rooms;
  },

  createRoom: async (data: {
    name: string;
    description?: string;
  }): Promise<RoomInfo> => {
    const response = await api.post<{ room: RoomInfo }>("/rooms", data);
    return response.data.room;
  },

  updateRoom: async (
    roomId: string,
    data: { name?: string; description?: string }
  ): Promise<RoomInfo> => {
    const response = await api.put<{ room: RoomInfo }>(
      `/rooms/${roomId}`,
      data
    );
    return response.data.room;
  },

  deleteRoom: async (roomId: string): Promise<void> => {
    await api.delete(`/rooms/${roomId}`);
  },

  getRoom: async (roomId: string): Promise<RoomInfo> => {
    const response = await api.get<{ room: RoomInfo }>(`/rooms/${roomId}`);
    return response.data.room;
  },
};
