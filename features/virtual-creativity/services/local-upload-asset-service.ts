import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";

import type {
  CategorizedTabAssets,
  TabAssetItem,
} from "@/services/api/tab-assets-service";
import { storage } from "@/utils/storage";

const LOCAL_UPLOADS_STORAGE_KEY = "virtual-creativity.local-uploads";
const LOCAL_UPLOADS_ROOT_DIR =
  FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? "";
const LOCAL_UPLOADS_DIR = `${LOCAL_UPLOADS_ROOT_DIR}virtual-creativity/uploads/`;
const LOCAL_UPLOADS_CATEGORY_ID = "local-uploads";
const LOCAL_UPLOADS_CATEGORY_NAME = "My Uploads";
const MAX_LOCAL_UPLOADS = 40;

interface LocalUploadAssetRecord {
  id: string;
  uri: string;
  createdAt: number;
}

const isLocalUploadAssetRecord = (
  value: unknown,
): value is LocalUploadAssetRecord => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.uri === "string" &&
    typeof candidate.createdAt === "number"
  );
};

const readStoredLocalUploads = (): LocalUploadAssetRecord[] => {
  const rawValue = storage.getString(LOCAL_UPLOADS_STORAGE_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isLocalUploadAssetRecord)
      .sort((left, right) => right.createdAt - left.createdAt);
  } catch {
    return [];
  }
};

const writeStoredLocalUploads = (uploads: LocalUploadAssetRecord[]) => {
  storage.setString(LOCAL_UPLOADS_STORAGE_KEY, JSON.stringify(uploads));
};

const ensureLocalUploadsDirectory = async () => {
  if (!LOCAL_UPLOADS_ROOT_DIR) {
    throw new Error("Local uploads directory is unavailable");
  }

  await FileSystem.makeDirectoryAsync(LOCAL_UPLOADS_DIR, {
    intermediates: true,
  });
};

const getPreferredImageExtension = (uri: string) => {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
  const extension = match?.[1]?.toLowerCase() ?? "";

  if (
    extension === "png" ||
    extension === "jpg" ||
    extension === "jpeg" ||
    extension === "webp"
  ) {
    return extension;
  }

  return "jpg";
};

const getManipulatorFormat = (extension: string) => {
  if (extension === "png") {
    return ImageManipulator.SaveFormat.PNG;
  }

  if (extension === "webp") {
    return ImageManipulator.SaveFormat.WEBP;
  }

  return ImageManipulator.SaveFormat.JPEG;
};

const createLocalUploadDestinationUri = (extension: string) =>
  `${LOCAL_UPLOADS_DIR}${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${extension}`;

const createPersistedImageCopy = async (sourceUri: string) => {
  const trimmedSourceUri = sourceUri.trim();
  const extension = getPreferredImageExtension(trimmedSourceUri);
  const destinationUri = createLocalUploadDestinationUri(extension);

  try {
    await FileSystem.copyAsync({
      from: trimmedSourceUri,
      to: destinationUri,
    });

    return destinationUri;
  } catch {
    const normalizedImage = await ImageManipulator.manipulateAsync(
      trimmedSourceUri,
      [],
      {
        compress: 1,
        format: getManipulatorFormat(extension),
      },
    );

    await FileSystem.copyAsync({
      from: normalizedImage.uri,
      to: destinationUri,
    });

    return destinationUri;
  }
};

const deleteLocalUploadFile = async (uri: string) => {
  try {
    await FileSystem.deleteAsync(uri);
  } catch {
    // Ignore cleanup failures for stale files.
  }
};

export const getLocalUploadAssets = async (): Promise<
  LocalUploadAssetRecord[]
> => {
  const storedUploads = readStoredLocalUploads();
  if (storedUploads.length === 0) {
    return [];
  }

  const uploadChecks = await Promise.all(
    storedUploads.map(async (upload) => ({
      upload,
      info: await FileSystem.getInfoAsync(upload.uri).catch(() => ({
        exists: false,
      })),
    })),
  );

  const existingUploads = uploadChecks
    .filter((entry) => entry.info.exists)
    .map((entry) => entry.upload);

  if (existingUploads.length !== storedUploads.length) {
    writeStoredLocalUploads(existingUploads);
  }

  return existingUploads;
};

export const persistLocalUploadAsset = async (
  sourceUri: string,
): Promise<LocalUploadAssetRecord> => {
  await ensureLocalUploadsDirectory();

  const persistedUri = await createPersistedImageCopy(sourceUri);
  const existingUploads = await getLocalUploadAssets();
  const nextUpload: LocalUploadAssetRecord = {
    id: `local-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    uri: persistedUri,
    createdAt: Date.now(),
  };

  const nextUploads = [nextUpload, ...existingUploads].slice(
    0,
    MAX_LOCAL_UPLOADS,
  );
  const keptUploadIds = new Set(nextUploads.map((upload) => upload.id));
  const removedUploads = existingUploads.filter(
    (upload) => !keptUploadIds.has(upload.id),
  );

  writeStoredLocalUploads(nextUploads);

  await Promise.all(
    removedUploads.map((upload) => deleteLocalUploadFile(upload.uri)),
  );

  return nextUpload;
};

export const fetchLocalUploadTabAssets =
  async (): Promise<CategorizedTabAssets> => {
    const uploads = await getLocalUploadAssets();
    const flatAssets: TabAssetItem[] = uploads.map((upload) => ({
      id: upload.id,
      image: upload.uri,
      isPremium: false,
    }));

    return {
      categories:
        flatAssets.length > 0
          ? [
              {
                id: LOCAL_UPLOADS_CATEGORY_ID,
                name: LOCAL_UPLOADS_CATEGORY_NAME,
                assets: flatAssets,
              },
            ]
          : [],
      flatAssets,
    };
  };
