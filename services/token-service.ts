import { makeApiRequest } from "@/services/api-service";

export class TokenService {
  /**
   * Get FCM token for a specific phone number
   */
  async getFCMToken(phoneNumber: string): Promise<string | null> {
    try {
      const response = await makeApiRequest({
        eventName: "get_notification_token",
        mobile_no: [phoneNumber],
      });

      if (response.code === 200) {
        const tokens = response.data as Array<string | null>;
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
      const response = await makeApiRequest({
        eventName: "get_notification_token",
        mobile_no: phoneNumbers,
      });

      const result: { [phoneNumber: string]: string | null } = {};

      if (response.code === 200) {
        const tokens = response.data as Array<string | null>;

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
