import { debugLog } from "@/constants/debug";
import { useAuthStore, type AuthSessionPayload } from "@/store/auth-store";
import {
  registerUserWithDevice,
  registerUserWithEmail,
  clearApiAuthToken,
  setApiAuthToken,
} from "./api-service";
import { getDeviceId } from "@/utils/device-utils";
import {
  signInWithGoogle,
  trySilentGoogleSignIn,
  type GoogleAuthUser,
} from "./google-auth-service";

type SessionResult =
  | { type: "success"; session: AuthSessionPayload }
  | { type: "cancelled" }
  | { type: "error"; message: string };

const buildSessionFromGoogleUser = async (
  googleUser: GoogleAuthUser,
): Promise<AuthSessionPayload> => {
  const deviceId = await getDeviceId();
  const response = await registerUserWithEmail(googleUser.email, deviceId);

  if (response.code !== 200 || !response.data?.token) {
    throw new Error(response.message || "Unable to create app session.");
  }

  return {
    accessToken: response.data.token,
    googleIdToken: googleUser.idToken,
    googleAccessToken: googleUser.accessToken,
    user: {
      id: googleUser.id,
      name: googleUser.name,
      email: googleUser.email,
      photo: googleUser.photo,
    },
  };
};

const applySession = (session: AuthSessionPayload) => {
  useAuthStore.getState().setAuthSession(session);
  setApiAuthToken(session.accessToken);
};

export const signInWithGoogleSession = async (): Promise<SessionResult> => {
  const result = await signInWithGoogle();

  if (result.type !== "success") {
    return result;
  }

  try {
    const session = await buildSessionFromGoogleUser(result.user);
    applySession(session);
    return { type: "success", session };
  } catch (error: any) {
    debugLog.error("Failed to create app session from Google login", error);
    return {
      type: "error",
      message: error?.message || "Google login failed while creating session.",
    };
  }
};

export const signInWithDeviceSession = async (): Promise<SessionResult> => {
  try {
    const deviceId = await getDeviceId();
    const response = await registerUserWithDevice(deviceId);

    if (response.code !== 200 || !response.data?.token) {
      throw new Error(response.message || "Unable to create guest session.");
    }

    const session: AuthSessionPayload = {
      accessToken: response.data.token,
      user: {
        id: deviceId,
        name: "Guest",
        email: null,
        photo: null,
      },
    };

    applySession(session);
    return { type: "success", session };
  } catch (error: any) {
    debugLog.error("Failed to create device session", error);
    return {
      type: "error",
      message: error?.message || "Unable to continue without login.",
    };
  }
};

export const trySilentGoogleSession =
  async (): Promise<AuthSessionPayload | null> => {
    try {
      const googleUser = await trySilentGoogleSignIn();

      if (!googleUser) {
        return null;
      }

      const session = await buildSessionFromGoogleUser(googleUser);
      applySession(session);
      return session;
    } catch (error) {
      debugLog.warn("Silent Google session restore failed", error);
      return null;
    }
  };

export const clearAuthSession = () => {
  useAuthStore.getState().clearAuthSession();
  clearApiAuthToken();
};
