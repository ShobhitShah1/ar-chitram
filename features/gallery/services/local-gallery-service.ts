import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";

import { storage } from "@/utils/storage";

const LOCAL_GALLERY_ROOT_DIR =
  FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? "";
const LOCAL_ART_CAPTURES_DIR = `${LOCAL_GALLERY_ROOT_DIR}gallery/art-captures/`;
const LOCAL_ART_CAPTURES_STORAGE_KEY = "gallery.local-art-captures";
const EXHIBITION_CAPTURE_REFS_STORAGE_KEY = "gallery.exhibition-capture-refs";
const MAX_LOCAL_ART_CAPTURES = 120;
const MAX_EXHIBITION_CAPTURE_REFS = 200;

export interface LocalArtCaptureRecord {
  id: string;
  uri: string;
  originalUri: string | null;
  createdAt: number;
}

export interface ExhibitionCaptureReferenceRecord {
  id: string;
  assetId: string;
  assetUri: string;
  originalUri: string | null;
  createdAt: number;
}

export interface ArtCaptureGroup {
  id: string;
  originalUri: string | null;
  coverUri: string;
  createdAt: number;
  captures: LocalArtCaptureRecord[];
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object";

const isLocalArtCaptureRecord = (
  value: unknown,
): value is LocalArtCaptureRecord => {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.uri === "string" &&
    typeof value.createdAt === "number" &&
    (typeof value.originalUri === "string" || value.originalUri === null)
  );
};

const isExhibitionCaptureReferenceRecord = (
  value: unknown,
): value is ExhibitionCaptureReferenceRecord => {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.assetId === "string" &&
    typeof value.assetUri === "string" &&
    typeof value.createdAt === "number" &&
    (typeof value.originalUri === "string" || value.originalUri === null)
  );
};

const readStoredRecords = <T>(
  storageKey: string,
  predicate: (value: unknown) => value is T,
): T[] => {
  const rawValue = storage.getString(storageKey);
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(predicate);
  } catch {
    return [];
  }
};

const writeStoredRecords = <T>(storageKey: string, records: T[]) => {
  storage.setString(storageKey, JSON.stringify(records));
};

const ensureDirectory = async (directoryUri: string) => {
  if (!LOCAL_GALLERY_ROOT_DIR) {
    throw new Error("Local gallery directory is unavailable");
  }

  await FileSystem.makeDirectoryAsync(directoryUri, {
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

const createDestinationUri = (directoryUri: string, extension: string) =>
  `${directoryUri}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

const createPersistedImageCopy = async (
  sourceUri: string,
  destinationDirectory: string,
) => {
  const trimmedSourceUri = sourceUri.trim();
  const extension = getPreferredImageExtension(trimmedSourceUri);
  const destinationUri = createDestinationUri(destinationDirectory, extension);

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

const deleteFileIfExists = async (uri: string) => {
  try {
    await FileSystem.deleteAsync(uri);
  } catch {
    // Ignore stale cleanup failures.
  }
};

const getExistingArtCaptures = async () => {
  const storedCaptures = readStoredRecords(
    LOCAL_ART_CAPTURES_STORAGE_KEY,
    isLocalArtCaptureRecord,
  ).sort((left, right) => right.createdAt - left.createdAt);

  if (storedCaptures.length === 0) {
    return [];
  }

  const captureChecks = await Promise.all(
    storedCaptures.map(async (capture) => ({
      capture,
      info: await FileSystem.getInfoAsync(capture.uri).catch(() => ({
        exists: false,
      })),
    })),
  );

  const existingCaptures = captureChecks
    .filter((entry) => entry.info.exists)
    .map((entry) => entry.capture);

  if (existingCaptures.length !== storedCaptures.length) {
    writeStoredRecords(LOCAL_ART_CAPTURES_STORAGE_KEY, existingCaptures);
  }

  return existingCaptures;
};

export const persistLocalArtCapture = async (
  sourceUri: string,
  options?: { originalUri?: string | null },
): Promise<LocalArtCaptureRecord> => {
  await ensureDirectory(LOCAL_ART_CAPTURES_DIR);

  const persistedUri = await createPersistedImageCopy(
    sourceUri,
    LOCAL_ART_CAPTURES_DIR,
  );
  const existingCaptures = await getExistingArtCaptures();
  const nextCapture: LocalArtCaptureRecord = {
    id: `art-capture-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    uri: persistedUri,
    originalUri: options?.originalUri ?? null,
    createdAt: Date.now(),
  };

  const nextCaptures = [nextCapture, ...existingCaptures].slice(
    0,
    MAX_LOCAL_ART_CAPTURES,
  );
  const keptCaptureIds = new Set(nextCaptures.map((capture) => capture.id));
  const removedCaptures = existingCaptures.filter(
    (capture) => !keptCaptureIds.has(capture.id),
  );

  writeStoredRecords(LOCAL_ART_CAPTURES_STORAGE_KEY, nextCaptures);

  await Promise.all(
    removedCaptures.map((capture) => deleteFileIfExists(capture.uri)),
  );

  return nextCapture;
};

export const persistLocalArtCaptures = async (
  sourceUris: string[],
  options?: { originalUri?: string | null },
): Promise<LocalArtCaptureRecord[]> => {
  const normalizedUris = sourceUris
    .map((uri) => uri?.trim())
    .filter((uri): uri is string => Boolean(uri));

  if (normalizedUris.length === 0) {
    return [];
  }

  const persistedCaptures: LocalArtCaptureRecord[] = [];

  for (const sourceUri of normalizedUris) {
    const persistedCapture = await persistLocalArtCapture(sourceUri, options);
    persistedCaptures.push(persistedCapture);
  }

  return persistedCaptures;
};

export const getLocalArtCaptures = async (): Promise<LocalArtCaptureRecord[]> =>
  getExistingArtCaptures();

export const getLocalArtCaptureGroups = async (): Promise<ArtCaptureGroup[]> => {
  const captures = await getExistingArtCaptures();
  const groupMap = new Map<string, ArtCaptureGroup>();

  for (const capture of captures) {
    const groupKey = capture.originalUri?.trim() || capture.id;
    const existingGroup = groupMap.get(groupKey);

    if (existingGroup) {
      existingGroup.captures.push(capture);
      continue;
    }

    groupMap.set(groupKey, {
      id: groupKey,
      originalUri: capture.originalUri,
      coverUri: capture.uri,
      createdAt: capture.createdAt,
      captures: [capture],
    });
  }

  return Array.from(groupMap.values()).sort(
    (left, right) => right.createdAt - left.createdAt,
  );
};

export const persistExhibitionCaptureReference = async (options: {
  assetId: string;
  assetUri: string;
  originalUri?: string | null;
}) => {
  const existingRecords = readStoredRecords(
    EXHIBITION_CAPTURE_REFS_STORAGE_KEY,
    isExhibitionCaptureReferenceRecord,
  ).sort((left, right) => right.createdAt - left.createdAt);

  const filteredExistingRecords = existingRecords.filter(
    (record) => record.assetId !== options.assetId,
  );
  const nextRecord: ExhibitionCaptureReferenceRecord = {
    id: `exhibition-capture-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    assetId: options.assetId,
    assetUri: options.assetUri,
    originalUri: options.originalUri ?? null,
    createdAt: Date.now(),
  };

  const nextRecords = [nextRecord, ...filteredExistingRecords].slice(
    0,
    MAX_EXHIBITION_CAPTURE_REFS,
  );
  writeStoredRecords(EXHIBITION_CAPTURE_REFS_STORAGE_KEY, nextRecords);

  return nextRecord;
};

export const getExhibitionCaptureReferences = async (): Promise<
  ExhibitionCaptureReferenceRecord[]
> =>
  readStoredRecords(
    EXHIBITION_CAPTURE_REFS_STORAGE_KEY,
    isExhibitionCaptureReferenceRecord,
  ).sort((left, right) => right.createdAt - left.createdAt);
