import { Story } from "@/constants/interface";
import { makeApiRequest } from "@/services/api-service";
import { ApiDataFor, ContestWinner, RemoteAsset } from "@/types/api";
import {
  getColorAssetUrl,
  getContestImageUrl,
  getContestTabAssetUrl,
  getDrawingAssetUrl,
  getProfileImageUrl,
  getSketchAssetUrl,
} from "@/utils/asset-url";

export interface TabAssetItem {
  id: string;
  image: string;
  isPremium: boolean;
  sku?: string;
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

export interface HomeWinnerItem extends Story {
  id: string;
  image: string;
  profileImage?: string;
}

export interface HomeTabAssets {
  homeGridItems: TabAssetItem[];
  stories: Story[];
  todayWinners: HomeWinnerItem[];
  last7DaysWinners: HomeWinnerItem[];
}

const resolveImageUrl = (
  rawValue: string | null | undefined,
  getUrl: (fileName?: string) => string | undefined,
): string | undefined => {
  const normalizedValue = rawValue?.trim();

  if (!normalizedValue) {
    return undefined;
  }

  if (/^https?:\/\//i.test(normalizedValue)) {
    return normalizedValue;
  }

  return getUrl(normalizedValue);
};

const getHomeAssetUrlByBasePath = (
  basePath?: string | null,
): ((fileName?: string) => string | undefined) => {
  switch (basePath?.trim()) {
    case "color_image":
      return getColorAssetUrl;
    case "drawing_image":
      return getDrawingAssetUrl;
    case "sketch_image":
      return getSketchAssetUrl;
    default:
      return getContestTabAssetUrl;
  }
};

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

  const imageUrl = resolveImageUrl(rawFileName, getUrl);
  if (!imageUrl) {
    return null;
  }

  return {
    id: `${categoryName}-${index}-${rawFileName}`,
    image: imageUrl,
    isPremium: Boolean(rawAsset.is_premium),
    sku: rawAsset.sku?.trim() || undefined,
  };
};

const mapCategorizedAssets = (
  responseData: ApiDataFor<"colors_assets">,
  getUrl: (fileName?: string) => string | undefined,
): CategorizedTabAssets => {
  const categories = (responseData.Category || []).map(
    (category, categoryIdx) => {
      const safeName =
        category.category_name?.trim() || `Category ${categoryIdx + 1}`;
      const assets = (category.assets || [])
        .map((asset, assetIdx) =>
          mapRemoteAsset(asset, assetIdx, safeName, getUrl),
        )
        .filter((asset): asset is TabAssetItem => asset !== null);

      return {
        id: `${safeName}-${categoryIdx}`,
        name: safeName,
        assets,
      };
    },
  );

  const flatAssets = categories.flatMap((category) => category.assets);

  return {
    categories,
    flatAssets,
  };
};

const toStoryItems = (winners: HomeWinnerItem[]): Story[] =>
  winners.map((winner) => ({
    _id: winner._id,
    image: winner.image,
    username: winner.username,
    profile_image: winner.profile_image,
    like_count: winner.like_count,
  }));

const mapContestWinner = (
  winner: ContestWinner,
  index: number,
  scope: "today" | "last7days",
): HomeWinnerItem | null => {
  const imageUrl = resolveImageUrl(winner.image, getContestImageUrl);
  if (!imageUrl) {
    return null;
  }

  const id = winner._id || `${scope}-${index}`;

  return {
    ...winner,
    id,
    _id: id,
    image: imageUrl,
    profileImage: resolveImageUrl(winner.profile_image, getProfileImageUrl),
  };
};

export const fetchHomeTabAssets = async (): Promise<HomeTabAssets> => {
  const [homeResponse, contestResponse] = await Promise.all([
    makeApiRequest<"at_home_list">({
      eventName: "at_home_list",
    }),
    makeApiRequest<"contest_winner_list">({
      eventName: "contest_winner_list",
    }),
  ]);

  const homeGridItems = (homeResponse.data.images || [])
    .map((asset, index) =>
      mapRemoteAsset(
        asset,
        index,
        "home",
        getHomeAssetUrlByBasePath(asset.base_path),
      ),
    )
    .filter((asset): asset is TabAssetItem => asset !== null);

  const todayWinners = (contestResponse.data.today || [])
    .map((winner, index) => mapContestWinner(winner, index, "today"))
    .filter((winner): winner is HomeWinnerItem => winner !== null);

  const last7DaysWinners = (contestResponse.data.last7days || [])
    .map((winner, index) => mapContestWinner(winner, index, "last7days"))
    .filter((winner): winner is HomeWinnerItem => winner !== null);

  return {
    homeGridItems,
    stories: toStoryItems(last7DaysWinners),
    todayWinners,
    last7DaysWinners,
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
