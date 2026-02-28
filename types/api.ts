export interface ApiResponse<TData> {
  code: number;
  data: TData;
  message: string;
}

export interface AccountData {
  _id: string;
  mobile_no: string[];
  name: string;
  profile_image: string | null;
}

export interface FetchAccountsResponse {
  count: number;
  data: AccountData[];
}

export interface RegisterResponse {
  token: string;
}

export interface ProfileResponseData {
  name: string;
  profile_image: string | null;
  SKU?: Array<string | null>;
}

export interface LegalDocumentResponse {
  _id: string;
  title: string;
  content: string;
  version: string;
  updatedAt: string;
}

export interface RemoteAsset {
  image: string;
  is_premium: boolean;
}

export interface RemoteAssetCategory {
  category_name: string;
  assets: RemoteAsset[];
}

export interface HomeListResponseData {
  images: RemoteAsset[];
}

export interface CategorizedAssetsResponseData {
  Category: RemoteAssetCategory[];
}

export interface ContestWinner {
  _id: string;
  image?: string;
  profile_image?: string;
  username?: string;
  like_count?: number;
  [key: string]: unknown;
}

export interface ContestWinnersResponseData {
  today: ContestWinner[];
  last7days: ContestWinner[];
}

export interface ContestWinningResponseData {
  win_results: ContestWinner[];
}

export interface ApiEventRequestMap {
  fetch_acc: {
    mobiles: string;
  };
  app_user_register: {
    mobile_no?: string;
    email_id?: string;
  };
  get_profile: Record<never, never>;
  app_user_inapp: {
    SKU: string;
  };
  update_notification_token: {
    notification_token: string;
  };
  get_notification_token: {
    mobile_no: string[];
  };
  load_assets: Record<never, never>;
  like_dislike: {
    contest_image_id?: string;
    value: 0 | 1;
  };
  liked: {
    contest_image_id?: string;
    value: 0 | 1;
  };
  get_contest_winning: Record<never, never>;
  contest_winner_list: Record<never, never>;
  get_privacy_policy: Record<never, never>;
  get_terms_of_use: Record<never, never>;
  get_library_license: Record<never, never>;
  at_home_list: Record<never, never>;
  colors_assets: Record<never, never>;
  drawings_assets: Record<never, never>;
  sketches_assets: Record<never, never>;
}

export interface ApiEventResponseMap {
  fetch_acc: FetchAccountsResponse;
  app_user_register: RegisterResponse;
  get_profile: ProfileResponseData;
  app_user_inapp: Record<string, unknown>;
  update_notification_token: Record<string, unknown> | string;
  get_notification_token: Array<string | null>;
  load_assets: Record<string, unknown>;
  like_dislike: Record<string, unknown>;
  liked: Record<string, unknown> | string;
  get_contest_winning: ContestWinningResponseData;
  contest_winner_list: ContestWinnersResponseData;
  get_privacy_policy: LegalDocumentResponse;
  get_terms_of_use: LegalDocumentResponse;
  get_library_license: LegalDocumentResponse;
  at_home_list: HomeListResponseData;
  colors_assets: CategorizedAssetsResponseData;
  drawings_assets: CategorizedAssetsResponseData;
  sketches_assets: CategorizedAssetsResponseData;
}

export type ApiEventName = keyof ApiEventRequestMap;

export type ApiRequestFor<TEvent extends ApiEventName> = {
  eventName: TEvent;
} & ApiEventRequestMap[TEvent];

export type ApiDataFor<TEvent extends ApiEventName> = ApiEventResponseMap[TEvent];

export type ApiRequest = ApiRequestFor<ApiEventName>;
