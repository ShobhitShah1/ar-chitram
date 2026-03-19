import {
  ACCENT_COLOR,
  CARD_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from "@/constants/colors";
import { FontFamily } from '@/constants/fonts';
import { BaseToast, ErrorToast, InfoToast } from "react-native-toast-message";

export const toastConfig: any = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: ACCENT_COLOR,
        backgroundColor: CARD_COLOR,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        color: TEXT_PRIMARY,
        fontFamily: FontFamily.semibold,
      }}
      text2Style={{
        fontSize: 12,
        color: TEXT_SECONDARY,
        fontFamily: FontFamily.regular,
      }}
    />
  ),

  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{
        backgroundColor: CARD_COLOR,
      }}
      text1Style={{
        fontSize: 15,
        color: TEXT_PRIMARY,
        fontFamily: FontFamily.semibold,
      }}
      text2Style={{
        fontSize: 12,
        color: TEXT_SECONDARY,
        fontFamily: FontFamily.regular,
      }}
    />
  ),

  info: (props: any) => (
    <InfoToast
      {...props}
      style={{
        borderLeftColor: "#3498db",
        backgroundColor: CARD_COLOR,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        color: TEXT_PRIMARY,
        fontFamily: FontFamily.semibold,
      }}
      text2Style={{
        fontSize: 12,
        color: TEXT_SECONDARY,
        fontFamily: FontFamily.regular,
      }}
    />
  ),
};
