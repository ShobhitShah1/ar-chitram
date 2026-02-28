import { debugLog } from "@/constants/debug";
import Constants from "expo-constants";
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
  type User,
} from "@react-native-google-signin/google-signin";

export type GoogleAuthUser = {
  id: string;
  name: string | null;
  email: string;
  photo: string | null;
  idToken: string | null;
  accessToken: string | null;
};

export type GoogleSignInResult =
  | { type: "success"; user: GoogleAuthUser }
  | { type: "cancelled" }
  | { type: "error"; message: string };

let isGoogleConfigured = false;

const getGoogleWebClientId = (): string | undefined => {
  const webClientId =
    (Constants.expoConfig?.extra?.googleWebClientId as string | undefined) ??
    undefined;

  return webClientId?.trim() || undefined;
};

const mapGoogleSignInError = (error: unknown): string => {
  if (isErrorWithCode(error)) {
    if (error.code === "DEVELOPER_ERROR") {
      return "Google config mismatch. Add current app SHA-1 in Firebase (Android OAuth), download new google-services.json, then rebuild.";
    }

    switch (error.code) {
      case statusCodes.IN_PROGRESS:
        return "Google sign-in is already in progress.";
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return "Google Play Services is not available on this device.";
      case statusCodes.SIGN_IN_REQUIRED:
        return "Please sign in with Google to continue.";
      case statusCodes.SIGN_IN_CANCELLED:
        return "Google sign-in was cancelled.";
      default:
        return "Google sign-in failed. Please try again.";
    }
  }

  return "Google sign-in failed. Please try again.";
};

const toGoogleAuthUser = (
  profile: User,
  accessToken: string | null,
): GoogleAuthUser => ({
  id: profile.user.id,
  name: profile.user.name,
  email: profile.user.email,
  photo: profile.user.photo,
  idToken: profile.idToken,
  accessToken,
});

export const configureGoogleSignIn = () => {
  if (isGoogleConfigured) {
    return;
  }

  const webClientId = getGoogleWebClientId();

  GoogleSignin.configure({
    webClientId,
    scopes: ["profile", "email"],
  });

  if (!webClientId) {
    debugLog.warn(
      "googleWebClientId is missing in app config. idToken may be unavailable.",
    );
  }

  isGoogleConfigured = true;
};

export const signInWithGoogle = async (): Promise<GoogleSignInResult> => {
  try {
    configureGoogleSignIn();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      return { type: "cancelled" };
    }

    const tokens = await GoogleSignin.getTokens().catch(() => null);

    return {
      type: "success",
      user: toGoogleAuthUser(response.data, tokens?.accessToken || null),
    };
  } catch (error) {
    const message = mapGoogleSignInError(error);
    debugLog.error("Google sign-in error", error);
    return { type: "error", message };
  }
};

export const trySilentGoogleSignIn = async (): Promise<GoogleAuthUser | null> => {
  try {
    configureGoogleSignIn();
    const response = await GoogleSignin.signInSilently();

    if (response.type !== "success") {
      return null;
    }

    const tokens = await GoogleSignin.getTokens().catch(() => null);
    return toGoogleAuthUser(response.data, tokens?.accessToken || null);
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_REQUIRED) {
      return null;
    }

    debugLog.warn("Silent Google sign-in failed", error);
    return null;
  }
};
