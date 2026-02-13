import { Story } from "@/constants/interface";
import { getContestWinners } from "@/services/api-service";
import { useQuery } from "@tanstack/react-query";


export interface ContestWinnersData {
  today: Story[];
  last7days: Story[];
}

export const useContestWinners = () => {
  const contestWinnersQuery = useQuery<ContestWinnersData>({
    queryKey: ["contest-winners"],
    queryFn: getContestWinners,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    contestWinners: contestWinnersQuery.data ?? { today: [], last7days: [] },
    ...contestWinnersQuery,
    isLoading: contestWinnersQuery.isLoading,
    error: contestWinnersQuery.error,
    refetch: contestWinnersQuery.refetch,
  };
};