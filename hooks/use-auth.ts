import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

export const useAuth = () => {
  const router = useRouter();

  const queryClient = useQueryClient();

  const login = async ({}: {}) => {};

  const logout = async () => {};

  return {
    login,
    logout,
    isLoggingIn: false,
  };
};
