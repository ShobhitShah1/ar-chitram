import axios from "axios";
import { debugLog } from "@/constants/debug";

const PEXELS_API_KEY =
  process.env.EXPO_PUBLIC_PEXELS_API_KEY ||
  "d051v3u3dj51S461FgFAHXEvrkuwCvHXn9Nkf0oD0WTaZtOFhCrT0YKa";
const PEXELS_BASE_URL = "https://api.pexels.com/v1";

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

export interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  next_page?: string;
}

const pexelsClient = axios.create({
  baseURL: PEXELS_BASE_URL,
  headers: {
    Authorization: PEXELS_API_KEY,
  },
  timeout: 10000,
});

export const searchPexelsImages = async (
  query: string,
  page = 1,
  perPage = 30,
  orientation?: "landscape" | "portrait" | "square",
): Promise<PexelsSearchResponse> => {
  try {
    const response = await pexelsClient.get<PexelsSearchResponse>("/search", {
      params: {
        query,
        page,
        per_page: perPage,
        orientation,
      },
    });
    return response.data;
  } catch (error: any) {
    debugLog.error(
      "Pexels Search API Error",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const getCuratedPexelsImages = async (
  page = 1,
  perPage = 30,
): Promise<PexelsSearchResponse> => {
  try {
    const response = await pexelsClient.get<PexelsSearchResponse>("/curated", {
      params: {
        page,
        per_page: perPage,
      },
    });
    return response.data;
  } catch (error: any) {
    debugLog.error(
      "Pexels Curated API Error",
      error.response?.data || error.message,
    );
    throw error;
  }
};
