import { useMutation } from "@tanstack/react-query";
import { joinContest } from "@/services/api-service";
import { useUser } from "@/context/user-context";

interface JoinContestParams {
  imageUri: string;
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
    onSuccess: (data) => {
    },
    onError: (error) => {
      console.error("Contest join failed:", error);
    },
  });
};