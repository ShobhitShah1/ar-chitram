import { getStoryFrameSize, StoryFrameSize } from "@/utiles/story-frame";
import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

interface UseStoryFrameSizeOptions {
  maxWidthRatio?: number;
  maxHeightRatio?: number;
}

export const useStoryFrameSize = (
  options: UseStoryFrameSizeOptions = {},
): StoryFrameSize => {
  const { width, height } = useWindowDimensions();
  const { maxWidthRatio = 1, maxHeightRatio = 1 } = options;

  return useMemo(
    () =>
      getStoryFrameSize({
        maxWidth: width * maxWidthRatio,
        maxHeight: height * maxHeightRatio,
      }),
    [height, maxHeightRatio, maxWidthRatio, width],
  );
};
