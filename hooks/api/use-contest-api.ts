import { Story } from "@/constants/interface";
import { apiQueryKeys } from "@/services/api/query-keys";
import {
  getContestWinning,
  getContestWinners,
  joinContest,
  likeAndDislike,
} from "@/services/api-service";
import { useUser } from "@/context/user-context";
import { useMutation, useQuery } from "@tanstack/react-query";

interface JoinContestParams {
  imageUri: string;
}

interface LikeContestImageParams {
  contestImageId?: string;
  isLiked: boolean;
}

export const useJoinContest = () => {
  const { phoneNumber } = useUser();

  return useMutation({
    mutationFn: async ({ imageUri }: JoinContestParams) => {
      // Use phone number from user context
      const mobileNo = phoneNumber || "";

      if (!mobileNo) {
        throw new Error("Phone number is required to join contest");
      }

      const result = await joinContest(imageUri, mobileNo);

      if (!result.success) {
        throw new Error(result.message);
      }

      return result;
    },
    onSuccess: () => {},
    onError: (error) => {
      console.error("Contest join failed:", error);
    },
  });
};

export const useContestWinnersList = () => {
  return useQuery({
    queryKey: apiQueryKeys.contest.winners,
    queryFn: getContestWinners,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};

export const useContestWinningResults = () => {
  return useQuery<Story[]>({
    queryKey: apiQueryKeys.contest.winning,
    queryFn: getContestWinning,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};

export const useLikeContestImage = () => {
  return useMutation({
    mutationFn: async ({ contestImageId, isLiked }: LikeContestImageParams) =>
      likeAndDislike(contestImageId, isLiked),
  });
};
