import axios from "axios";
import { debugLog } from "@/constants/debug";

const UNSPLASH_ACCESS_KEY = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY || ""; // Access Key from env

const UNSPLASH_BASE_URL = "https://api.unsplash.com";

export interface UnsplashPhoto {
  id: string;
  width: number;
  height: number;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    username: string;
  };
  description: string | null;
  alt_description: string | null;
}

export interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

const unsplashClient = axios.create({
  baseURL: UNSPLASH_BASE_URL,
  headers: {
    Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
  },
  timeout: 10000,
});

export const searchUnsplashImages = async (
  query: string,
  page = 1,
  perPage = 30,
  orientation?: "landscape" | "portrait" | "squarish",
): Promise<UnsplashSearchResponse> => {
  try {
    const response = await unsplashClient.get<UnsplashSearchResponse>(
      "/search/photos",
      {
        params: {
          query,
          page,
          per_page: perPage,
          orientation,
        },
      },
    );
    return response.data;
  } catch (error: any) {
    debugLog.error(
      "Unsplash Search API Error",
      error.response?.data || error.message,
    );
    throw error;
  }
};
