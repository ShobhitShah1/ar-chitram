import { debugLog } from "@/constants/debug";
import axios from "axios";

/**
 * Pixabay API Key: 55398047-ffb272b175ba5581498ff27bc
 * (Hardcoded to ensure validity since environment variables can sometimes fail to load in Expo Go)
 */
const PIXABAY_API_KEY = "55398047-ffb272b175ba5581498ff27bc";
const PIXABAY_BASE_URL = "https://pixabay.com/api/";

export interface PixabayImage {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  previewURL: string;
  previewWidth: number;
  previewHeight: number;
  webformatURL: string;
  webformatWidth: number;
  webformatHeight: number;
  largeImageURL: string;
  imageWidth: number;
  imageHeight: number;
  views: number;
  downloads: number;
  likes: number;
  user: string;
  userImageURL: string;
}

interface PixabaySearchResponse {
  total: number;
  totalHits: number;
  hits: PixabayImage[];
}

export interface PixabaySearchParams {
  query: string;
  page?: number;
  perPage?: number;
  imageType?: "all" | "photo" | "illustration" | "vector";
  orientation?: "all" | "horizontal" | "vertical";
  category?: string;
  order?: "popular" | "latest";
}

export const searchPixabayImages = async (
  params: PixabaySearchParams,
): Promise<PixabaySearchResponse> => {
  const {
    query,
    page = 1,
    perPage = 30,
    imageType = "photo",
    orientation = "all",
    order = "popular",
  } = params;

  try {
    const response = await axios.get<PixabaySearchResponse>(PIXABAY_BASE_URL, {
      params: {
        key: PIXABAY_API_KEY,
        q: query.trim(),
        page,
        per_page: perPage,
        image_type: imageType,
        orientation,
        order,
        safesearch: "true", // Pixabay docs specify strings "true" or "false"
      },
      timeout: 10000,
    });

    debugLog.info("Pixabay search response", response.data);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      debugLog.error("Pixabay Search API Error", {
        status: error.response.status,
        data: error.response.data,
        config: {
          url: error.config.url,
          params: {
            ...error.config.params,
            key: `***${PIXABAY_API_KEY.slice(-4)}`,
          },
        },
      });
    } else {
      debugLog.error("Pixabay Search Network Error", error.message);
    }
    throw error;
  }
};

export const getPopularPixabayImages = async (
  page = 1,
  perPage = 30,
): Promise<PixabaySearchResponse> => {
  try {
    const response = await axios.get<PixabaySearchResponse>(PIXABAY_BASE_URL, {
      params: {
        key: PIXABAY_API_KEY,
        page,
        per_page: perPage,
        image_type: "photo",
        order: "popular",
        editors_choice: "true",
        safesearch: "true",
      },
      timeout: 10000,
    });

    debugLog.info("Pixabay popular response", response.data);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      debugLog.error("Pixabay Popular API Error", {
        status: error.response.status,
        data: error.response.data,
      });
    }
    throw error;
  }
};
