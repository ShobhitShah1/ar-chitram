import { storage } from "@/utiles/storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  photo: string | null;
}

export interface AuthSessionPayload {
  accessToken: string;
  user: AuthUser;
  googleIdToken?: string | null;
  googleAccessToken?: string | null;
}

interface AuthState {
  accessToken: string | null;
  googleIdToken: string | null;
  googleAccessToken: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setAuthSession: (payload: AuthSessionPayload) => void;
  clearAuthSession: () => void;
  setHydrated: (hydrated: boolean) => void;
}

const zustandMMKVStorage = {
  setItem: (name: string, value: string) => {
    storage.setString(name, value);
  },
  getItem: (name: string) => storage.getString(name) ?? null,
  removeItem: (name: string) => {
    storage.removeItem(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      googleIdToken: null,
      googleAccessToken: null,
      user: null,
      hydrated: false,
      setAuthSession: (payload) =>
        set({
          accessToken: payload.accessToken,
          googleIdToken: payload.googleIdToken ?? null,
          googleAccessToken: payload.googleAccessToken ?? null,
          user: payload.user,
        }),
      clearAuthSession: () =>
        set({
          accessToken: null,
          googleIdToken: null,
          googleAccessToken: null,
          user: null,
        }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "@auth-store",
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        googleIdToken: state.googleIdToken,
        googleAccessToken: state.googleAccessToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

export const getAuthToken = () => useAuthStore.getState().accessToken;
export const getAuthUserId = () => useAuthStore.getState().user?.id ?? null;
