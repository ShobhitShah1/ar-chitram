import axios from "axios";
import { getFromSecureStore } from "@/utiles/secure-storage";

// Data API for notification tokens
const dataApi = axios.create({
  baseURL: "https://nirvanatechlabs.in/ar_chitram/api/data",
  headers: {
    "Content-Type": "application/json",
    app_secret: "_a_r_c_h_i_t_r_a_m_",
  },
  timeout: 30000,
});

// Request interceptor to add auth token
dataApi.interceptors.request.use(
  async (config) => {
    try {
      const token = await getFromSecureStore("userToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {}
    return config;
  },
  (error) => Promise.reject(error),
);

export class TokenService {
  /**
   * Get FCM token for a specific phone number
   */
  async getFCMToken(phoneNumber: string): Promise<string | null> {
    try {
      const response = await dataApi.post("", {
        eventName: "get_notification_token",
        mobile_no: [phoneNumber],
      });

      if (response.data.code === 200) {
        const tokens = response.data.data as (string | null)[];
        return tokens[0] || null;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Get FCM tokens for multiple phone numbers
   */
  async getFCMTokens(
    phoneNumbers: string[],
  ): Promise<{ [phoneNumber: string]: string | null }> {
    try {
      const response = await dataApi.post("", {
        eventName: "get_notification_token",
        mobile_no: phoneNumbers,
      });

      const result: { [phoneNumber: string]: string | null } = {};

      if (response.data.code === 200) {
        const tokens = response.data.data as (string | null)[];

        phoneNumbers.forEach((phoneNumber, index) => {
          const token = index < tokens.length ? tokens[index] : null;
          result[phoneNumber] = token;
        });
      } else {
        phoneNumbers.forEach((phoneNumber) => {
          result[phoneNumber] = null;
        });
      }

      return result;
    } catch (error) {
      const result: { [phoneNumber: string]: string | null } = {};
      phoneNumbers.forEach((phoneNumber) => {
        result[phoneNumber] = null;
      });
      return result;
    }
  }
}

export const tokenService = new TokenService();
