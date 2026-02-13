import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";
import { ImageProcessor } from "./image-processor";
import { QualityOption } from "@/components/quality-selection-modal";
import { saveToGigglamAlbum } from "./media-save-service";

export interface DownloadProgress {
  progress: number; // 0-1
  stage: "preparing" | "processing" | "saving" | "complete";
  message: string;
}

export interface DownloadResult {
  success: boolean;
  uri?: string;
  error?: string;
  fileSize?: number;
  quality?: string;
}

export class DownloadService {
  /**
   * Download image with specified quality
   */
  static async downloadWithQuality(
    imageUri: string,
    quality: QualityOption,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<DownloadResult> {
    let tempUri: string | null = null;

    try {
      // Step 1: Check permissions
      onProgress?.({
        progress: 0.1,
        stage: "preparing",
        message: "Checking permissions...",
      });

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Storage permission not granted");
      }

      // Step 2: Prepare image
      onProgress?.({
        progress: 0.2,
        stage: "preparing",
        message: "Preparing image...",
      });

      if (imageUri.startsWith("data:")) {
        tempUri = await ImageProcessor.dataUrlToFileUri(imageUri);
        imageUri = tempUri;
      }

      // Step 3: Process image
      onProgress?.({
        progress: 0.4,
        stage: "processing",
        message: `Processing ${quality.resolution} quality...`,
      });

      const processedImage = await ImageProcessor.processImageForQuality(
        imageUri,
        quality
      );

      // Step 4: Save to gallery using global media save service
      onProgress?.({
        progress: 0.7,
        stage: "saving",
        message: "Saving to gallery...",
      });

      const asset = await saveToGigglamAlbum(processedImage.uri);

      // Step 5: Complete
      onProgress?.({
        progress: 1.0,
        stage: "complete",
        message: "Download complete!",
      });

      await ImageProcessor.cleanupTempFile(processedImage.uri);

      return {
        success: true,
        uri: asset.uri,
        fileSize: processedImage.size,
        quality: quality.resolution,
      };
    } catch (error) {
      console.error("Download failed:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Download failed",
      };
    } finally {
      // Cleanup temp file if created
      if (tempUri) {
        await ImageProcessor.cleanupTempFile(tempUri);
      }
    }
  }

  /**
   * Get available storage space
   */
  static async getAvailableSpace(): Promise<number> {
    try {
      const info = await FileSystem.getFreeDiskStorageAsync();
      return info;
    } catch (error) {
      console.warn("Could not get available space:", error);
      return 0;
    }
  }

  /**
   * Check if there's enough space for download
   */
  static async hasEnoughSpace(estimatedSize: number): Promise<boolean> {
    try {
      const availableSpace = await this.getAvailableSpace();
      const requiredSpace = estimatedSize * 1.5; // Add 50% buffer
      return availableSpace > requiredSpace;
    } catch (error) {
      console.warn("Could not check available space:", error);
      return true; // Assume enough space if check fails
    }
  }

  /**
   * Get estimated download size for quality
   */
  static getEstimatedSize(quality: QualityOption): number {
    // Return estimated size in bytes
    switch (quality.id) {
      case "480p":
        return 2 * 1024 * 1024; // 2MB
      case "720p":
        return 5 * 1024 * 1024; // 5MB
      case "1080p":
        return 10 * 1024 * 1024; // 10MB
      default:
        return 2 * 1024 * 1024;
    }
  }

  /**
   * Validate image URI before download
   */
  static async validateImageUri(uri: string): Promise<boolean> {
    try {
      if (uri.startsWith("data:")) {
        // Data URL validation
        return uri.includes("data:image/") && uri.includes("base64,");
      } else {
        // File URI validation
        const info = await FileSystem.getInfoAsync(uri);
        return info.exists;
      }
    } catch (error) {
      console.error("Image URI validation failed:", error);
      return false;
    }
  }
}
