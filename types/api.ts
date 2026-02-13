export interface ApiRequest {
  eventName: string;
  [key: string]: any;
}

export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

export interface FetchAccountsRequest extends ApiRequest {
  eventName: "fetch_acc";
  mobiles: string;
}

export interface AccountData {
  _id: string;
  mobile_no: string[];
  name: string;
  profile_image: string;
}

export interface FetchAccountsResponse {
  count: number;
  data: AccountData[];
}

export interface RegisterRequest extends ApiRequest {
  eventName: "app_user_register";
  mobile_no: string;
}

export interface RegisterResponse {
  token: string;
}

export interface SendOTPRequest extends ApiRequest {
  eventName: "send_otp";
  mobile_no: string;
}

export interface SendOTPResponse {
  success: boolean;
  message: string;
}

export interface VerifyOTPRequest extends ApiRequest {
  eventName: "verify_otp";
  mobile_no: string;
  otp: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  token?: string;
  message: string;
}