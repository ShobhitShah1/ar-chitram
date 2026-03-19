export const STORY_FRAME_WIDTH = 1080;
export const STORY_FRAME_HEIGHT = 1920;
export const STORY_FRAME_ASPECT_RATIO = STORY_FRAME_WIDTH / STORY_FRAME_HEIGHT; // 9:16
export const STORY_TILE_ASPECT_RATIO = STORY_FRAME_HEIGHT / STORY_FRAME_WIDTH; // 16:9

export interface StoryFrameSize {
  width: number;
  height: number;
}

interface StoryFrameSizeInput {
  maxWidth: number;
  maxHeight: number;
}

export const getStoryFrameSize = ({
  maxWidth,
  maxHeight,
}: StoryFrameSizeInput): StoryFrameSize => {
  if (maxWidth <= 0 || maxHeight <= 0) {
    return { width: 0, height: 0 };
  }

  const widthFromHeight = maxHeight * STORY_FRAME_ASPECT_RATIO;

  if (widthFromHeight <= maxWidth) {
    return {
      width: widthFromHeight,
      height: maxHeight,
    };
  }

  return {
    width: maxWidth,
    height: maxWidth / STORY_FRAME_ASPECT_RATIO,
  };
};

export const isLocalAssetUri = (uri: string): boolean => {
  const normalized = uri.toLowerCase();
  return (
    normalized.startsWith("file://") ||
    normalized.startsWith("content://") ||
    normalized.startsWith("ph://") ||
    normalized.startsWith("assets-library://")
  );
};
