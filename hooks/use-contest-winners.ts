import { Story } from "@/constants/interface";
import { apiQueryKeys } from "@/services/api/query-keys";
import { getContestWinning, getContestWinners } from "@/services/api-service";
import { useQuery } from "@tanstack/react-query";


export interface ContestWinnersData {
  today: Story[];
  last7days: Story[];
}

export interface ContestWinningData {
  win_results: Story[];
}

export const useContestWinners = () => {
  const contestWinnersQuery = useQuery<ContestWinnersData>({
    queryKey: apiQueryKeys.contest.winners,
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

export const useContestWinning = () => {
  const contestWinningQuery = useQuery<Story[]>({
    queryKey: apiQueryKeys.contest.winning,
    queryFn: getContestWinning,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    contestWinning: contestWinningQuery.data ?? [],
    ...contestWinningQuery,
    isLoading: contestWinningQuery.isLoading,
    error: contestWinningQuery.error,
    refetch: contestWinningQuery.refetch,
  };
};
