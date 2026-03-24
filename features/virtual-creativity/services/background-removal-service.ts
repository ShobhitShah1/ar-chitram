import { debugLog } from "@/constants/debug";
import { normalizeImageToStoryFrame } from "@/services/story-image-service";
import { isNativeBackgroundRemovalSupported } from "@six33/react-native-bg-removal";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import { Image as RNImage } from "react-native";
import DeviceInfo from "react-native-device-info";

const DEFAULT_BG_REMOVE_MAX_SIDE = 1280;
const FALLBACK_BG_REMOVE_MAX_SIDE = 960;

export type BackgroundRemovalErrorReason =
  | "unsupported"
  | "model-download"
  | "source-unavailable"
  | "engine-failure"
  | "busy"
  | "simulator"
  | "out-of-memory"
  | "unknown";

export interface BackgroundRemovalErrorInfo {
  reason: BackgroundRemovalErrorReason;
  message: string;
  rawMessage: string;
}

interface PrepareBackgroundRemovalSourceOptions {
  maxSide?: number;
  compress?: number;
}

const getImageSize = (
  uri: string,
): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    RNImage.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error),
    );
  });

const getUriScheme = (uri: string) =>
  uri.split(":")[0]?.toLowerCase() ?? "unknown";

const getLoggableUri = (uri: string) => {
  const cleanedUri = uri.trim();
  return {
    scheme: getUriScheme(cleanedUri),
    length: cleanedUri.length,
    sample: cleanedUri.slice(0, 80),
  };
};

const getErrorText = (error: unknown): string => {
  if (!error) {
    return "";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return `${error.name} ${error.message}`.trim();
  }

  if (typeof error === "object") {
    const candidate = error as Record<string, unknown>;
    return [
      typeof candidate.code === "string" ? candidate.code : "",
      typeof candidate.message === "string" ? candidate.message : "",
      typeof candidate.localizedDescription === "string"
        ? candidate.localizedDescription
        : "",
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  return String(error);
};

const getBackgroundRemovalRuntimeContext = () => {
  try {
    return {
      isEmulator: DeviceInfo.isEmulatorSync(),
      hasGms: DeviceInfo.hasGmsSync(),
      apiLevel: DeviceInfo.getApiLevelSync(),
      model: DeviceInfo.getModel(),
      systemVersion: DeviceInfo.getSystemVersion(),
    };
  } catch {
    return null;
  }
};

const buildCacheUri = (prefix: string, extension = "jpg") =>
  `${FileSystem.cacheDirectory}${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${extension}`;

const resolveMediaLibraryLocalUri = async (
  imageUri: string,
): Promise<string | null> => {
  if (
    !imageUri.startsWith("ph://") &&
    !imageUri.startsWith("assets-library://")
  ) {
    return null;
  }

  try {
    const assetId = imageUri.replace("ph://", "").split("/")[0] || imageUri;
    const assetInfo = await MediaLibrary.getAssetInfoAsync(assetId);
    const localUri = assetInfo?.localUri ?? null;

    if (localUri) {
      debugLog.info("[BG REMOVE] Resolved media-library asset", {
        input: getLoggableUri(imageUri),
        local: getLoggableUri(localUri),
      });
    }

    return localUri;
  } catch (error) {
    debugLog.warn("[BG REMOVE] Failed to resolve media-library asset", {
      input: getLoggableUri(imageUri),
      error: getErrorText(error),
    });
    return null;
  }
};

const copyUriToCache = async (imageUri: string): Promise<string | null> => {
  const targetUri = buildCacheUri("bg-remove-source", "jpg");

  try {
    await FileSystem.copyAsync({
      from: imageUri,
      to: targetUri,
    });

    debugLog.info("[BG REMOVE] Copied source to cache", {
      from: getLoggableUri(imageUri),
      to: getLoggableUri(targetUri),
    });

    return targetUri;
  } catch (error) {
    debugLog.warn("[BG REMOVE] Copy to cache failed", {
      from: getLoggableUri(imageUri),
      to: getLoggableUri(targetUri),
      error: getErrorText(error),
    });
    return null;
  }
};

const renderUriToCache = async (
  imageUri: string,
  compress = 0.92,
): Promise<string | null> => {
  try {
    const result = await ImageManipulator.manipulateAsync(imageUri, [], {
      compress,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    debugLog.info("[BG REMOVE] Re-rendered source to cache", {
      input: getLoggableUri(imageUri),
      output: getLoggableUri(result.uri),
    });

    return result.uri;
  } catch (error) {
    debugLog.warn("[BG REMOVE] Re-render to cache failed", {
      input: getLoggableUri(imageUri),
      error: getErrorText(error),
    });
    return null;
  }
};

const ensureReadableLocalImageUri = async (
  imageUri: string,
  compress = 0.92,
): Promise<string> => {
  const trimmedUri = imageUri.trim();

  if (trimmedUri.startsWith("file://")) {
    return trimmedUri;
  }

  const mediaLibraryUri = await resolveMediaLibraryLocalUri(trimmedUri);
  if (mediaLibraryUri?.startsWith("file://")) {
    return mediaLibraryUri;
  }

  const copiedUri = await copyUriToCache(mediaLibraryUri ?? trimmedUri);
  if (copiedUri) {
    return copiedUri;
  }

  const renderedUri = await renderUriToCache(
    mediaLibraryUri ?? trimmedUri,
    compress,
  );
  if (renderedUri) {
    return renderedUri;
  }

  throw new Error("Unable to load image");
};

export const getBackgroundRemovalErrorInfo = (
  error: unknown,
): BackgroundRemovalErrorInfo => {
  if (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { reason?: unknown }).reason === "string" &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const existingError = error as BackgroundRemovalErrorInfo;
    return {
      reason: existingError.reason,
      message: existingError.message,
      rawMessage: existingError.rawMessage ?? existingError.message,
    };
  }

  const rawMessage = getErrorText(error);
  const normalized = rawMessage.toLowerCase();

  if (
    normalized.includes("requires_api_fallback") ||
    normalized.includes("api fallback")
  ) {
    return {
      reason: "unsupported",
      message: "Background removal is not supported on this device yet.",
      rawMessage,
    };
  }

  if (
    normalized.includes("optional module to be downloaded") ||
    (normalized.includes("download") && normalized.includes("module"))
  ) {
    return {
      reason: "model-download",
      message: "The AI model is still downloading. Please wait a moment.",
      rawMessage,
    };
  }

  if (
    normalized.includes("unable to load image") ||
    normalized.includes("invalid url")
  ) {
    return {
      reason: "source-unavailable",
      message: "This image could not be prepared for background removal.",
      rawMessage,
    };
  }

  if (normalized.includes("thin subject segmenter")) {
    const runtimeContext = getBackgroundRemovalRuntimeContext();
    const emulatorMessage = runtimeContext?.isEmulator
      ? "Background removal failed in the Android ML Kit engine on this emulator. Try a physical device."
      : "Background removal failed in the Android ML Kit engine on this device.";

    return {
      reason: "engine-failure",
      message: emulatorMessage,
      rawMessage,
    };
  }

  if (normalized.includes("another background removal is in progress")) {
    return {
      reason: "busy",
      message: "Background removal is already running. Please wait a moment.",
      rawMessage,
    };
  }

  if (normalized.includes("simulatorerror")) {
    return {
      reason: "simulator",
      message: "Background removal needs a real device instead of a simulator.",
      rawMessage,
    };
  }

  if (normalized.includes("out of memory")) {
    return {
      reason: "out-of-memory",
      message:
        "This image is too heavy for the device right now. Try a slightly smaller photo.",
      rawMessage,
    };
  }

  return {
    reason: "unknown",
    message: "Background removal failed. Please try again.",
    rawMessage,
  };
};

export const shouldRetryBackgroundRemovalWithFallback = (error: unknown) =>
  getBackgroundRemovalErrorInfo(error)
    .rawMessage.toLowerCase()
    .includes("thin subject segmenter");

export const checkBackgroundRemovalNativeSupport =
  async (): Promise<boolean> => {
    debugLog.info("[BG REMOVE] Checking native support");

    try {
      const supported = await isNativeBackgroundRemovalSupported();
      debugLog.info("[BG REMOVE] Native support result", {
        supported,
        runtime: getBackgroundRemovalRuntimeContext(),
        note: "This check is optimistic on Android and does not verify ML Kit runtime health.",
      });
      return supported;
    } catch (error) {
      debugLog.warn(
        "[BG REMOVE] Native support check failed, assuming supported",
        {
          error: getErrorText(error),
          runtime: getBackgroundRemovalRuntimeContext(),
        },
      );
      return true;
    }
  };

export const prepareBackgroundRemovalSource = async (
  imageUri: string,
  options: PrepareBackgroundRemovalSourceOptions = {},
): Promise<string> => {
  const maxSide = options.maxSide ?? DEFAULT_BG_REMOVE_MAX_SIDE;
  const compress = options.compress ?? 0.92;

  debugLog.info("[BG REMOVE] Preparing image source", {
    uri: getLoggableUri(imageUri),
    maxSide,
    compress,
  });

  const readableUri = await ensureReadableLocalImageUri(imageUri, compress);
  const sourceSize = await getImageSize(readableUri).catch((error) => {
    debugLog.warn("[BG REMOVE] Failed to measure image size", {
      uri: getLoggableUri(readableUri),
      error: getErrorText(error),
    });
    return null;
  });

  if (!sourceSize) {
    const renderedUri = await renderUriToCache(readableUri, compress);
    if (renderedUri) {
      return renderedUri;
    }
    return readableUri;
  }

  const sourceMaxSide = Math.max(sourceSize.width, sourceSize.height);
  const scale = Math.min(1, maxSide / sourceMaxSide);
  const targetWidth = Math.max(1, Math.round(sourceSize.width * scale));
  const targetHeight = Math.max(1, Math.round(sourceSize.height * scale));

  const normalizedResult = await normalizeImageToStoryFrame(readableUri, {
    targetWidth,
    targetHeight,
    fit: "contain",
    compress,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  debugLog.info("[BG REMOVE] Prepared normalized source", {
    input: getLoggableUri(readableUri),
    output: getLoggableUri(normalizedResult.uri),
    width: normalizedResult.width,
    height: normalizedResult.height,
  });

  return normalizedResult.uri;
};

export const prepareBackgroundRemovalFallbackSource = async (
  imageUri: string,
) =>
  prepareBackgroundRemovalSource(imageUri, {
    maxSide: FALLBACK_BG_REMOVE_MAX_SIDE,
    compress: 0.84,
  });

export const logBackgroundRemovalFailure = (
  stage: string,
  error: unknown,
  context?: Record<string, unknown>,
) => {
  const errorInfo = getBackgroundRemovalErrorInfo(error);

  debugLog.error(`[BG REMOVE] ${stage}`, {
    ...context,
    reason: errorInfo.reason,
    message: errorInfo.message,
    rawMessage: errorInfo.rawMessage,
    runtime: getBackgroundRemovalRuntimeContext(),
  });
};
