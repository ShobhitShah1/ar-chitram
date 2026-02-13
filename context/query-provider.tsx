import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { debugLog } from "@/constants/debug";

// Create a query client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache time: Data stays in cache for 10 minutes after becoming unused
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus (useful for web, harmless for mobile)
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      onError: (error) => {
        debugLog.error("Mutation error", error);
      },
      onSuccess: (data) => {
        debugLog.info("Mutation success", data);
      },
    },
  },
});

// Add global error handling
queryClient.setMutationDefaults(['auth'], {
  mutationFn: async (variables: any) => {
    debugLog.api("Auth mutation started", variables);
    return variables;
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Export the query client for use in custom hooks
export { queryClient };