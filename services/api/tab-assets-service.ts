import { Story } from "@/constants/interface";
import { makeApiRequest } from "@/services/api-service";
import { ApiDataFor, RemoteAsset } from "@/types/api";
import {
  getColorAssetUrl,
  getContestTabAssetUrl,
  getDrawingAssetUrl,
  getSketchAssetUrl,
} from "@/utiles/asset-url";

export interface TabAssetItem {
  id: string;
  image: string;
  isPremium: boolean;
}

export interface TabAssetCategory {
  id: string;
  name: string;
  assets: TabAssetItem[];
}

export interface CategorizedTabAssets {
  categories: TabAssetCategory[];
  flatAssets: TabAssetItem[];
}

export interface HomeTabAssets {
  galleryImages: TabAssetItem[];
  stories: Story[];
}

const mapRemoteAsset = (
  rawAsset: RemoteAsset,
  index: number,
  categoryName: string,
  getUrl: (fileName?: string) => string | undefined,
): TabAssetItem | null => {
  const rawFileName = rawAsset?.image?.trim();
  if (!rawFileName) {
    return null;
  }

  const imageUrl = getUrl(rawFileName);
  if (!imageUrl) {
    return null;
  }

  return {
    id: `${categoryName}-${index}-${rawFileName}`,
    image: imageUrl,
    isPremium: Boolean(rawAsset.is_premium),
  };
};

const mapCategorizedAssets = (
  responseData: ApiDataFor<"colors_assets">,
  getUrl: (fileName?: string) => string | undefined,
): CategorizedTabAssets => {
  const categories = (responseData.Category || []).map((category, categoryIdx) => {
    const safeName = category.category_name?.trim() || `Category ${categoryIdx + 1}`;
    const assets = (category.assets || [])
      .map((asset, assetIdx) => mapRemoteAsset(asset, assetIdx, safeName, getUrl))
      .filter((asset): asset is TabAssetItem => asset !== null);

    return {
      id: `${safeName}-${categoryIdx}`,
      name: safeName,
      assets,
    };
  });

  const flatAssets = categories.flatMap((category) => category.assets);

  return {
    categories,
    flatAssets,
  };
};

const toStoryItems = (assets: TabAssetItem[]): Story[] =>
  assets.map((asset) => ({
    _id: asset.id,
    image: asset.image,
  }));

export const fetchHomeTabAssets = async (): Promise<HomeTabAssets> => {
  const response = await makeApiRequest<"at_home_list">({
    eventName: "at_home_list",
  });

  const galleryImages = (response.data.images || [])
    .map((asset, index) => mapRemoteAsset(asset, index, "home", getContestTabAssetUrl))
    .filter((asset): asset is TabAssetItem => asset !== null);

  return {
    galleryImages,
    stories: toStoryItems(galleryImages),
  };
};

export const fetchColorsTabAssets = async (): Promise<CategorizedTabAssets> => {
  const response = await makeApiRequest<"colors_assets">({
    eventName: "colors_assets",
  });
  return mapCategorizedAssets(response.data, getColorAssetUrl);
};

export const fetchDrawingsTabAssets =
  async (): Promise<CategorizedTabAssets> => {
    const response = await makeApiRequest<"drawings_assets">({
      eventName: "drawings_assets",
    });
    return mapCategorizedAssets(response.data, getDrawingAssetUrl);
  };

export const fetchSketchesTabAssets =
  async (): Promise<CategorizedTabAssets> => {
    const response = await makeApiRequest<"sketches_assets">({
      eventName: "sketches_assets",
    });
    return mapCategorizedAssets(response.data, getSketchAssetUrl);
  };
