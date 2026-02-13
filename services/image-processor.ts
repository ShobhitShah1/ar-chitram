import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";

import { QualityOption } from "@/components/quality-selection-modal";

interface ProcessedImage {
  uri: string;
  width: number;
  height: number;
  size: number;
}

export class ImageProcessor {
  /**
   * Process an image to the specified quality by adjusting compression, without changing dimensions.
   */
  static async processImageForQuality(
    sourceUri: string,
    quality: QualityOption
  ): Promise<ProcessedImage> {
    try {
      // Process the image by applying only a compression level.
      // The dimensions (width/height) will remain the same as the original.
      const result = await ImageManipulator.manipulateAsync(
        sourceUri,
        [], // No resize, flip, or crop actions are applied.
        {
          compress: this.getCompressionQuality(quality.id),
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Get processed image info to determine its final size.
      const processedInfo = await FileSystem.getInfoAsync(result.uri);
      const size =
        processedInfo.exists && "size" in processedInfo
          ? processedInfo.size
          : 0;

      return {
        uri: result.uri,
        width: result.width,
        height: result.height,
        size,
      };
    } catch (error) {
      console.error("Error processing image:", error);
      throw new Error("Failed to process image for download");
    }
  }

  /**
   * Get compression quality for quality level
   */
  private static getCompressionQuality(qualityId: string): number {
    switch (qualityId) {
      case "480p":
        return 0.4; // Higher compression for much smaller files
      case "720p":
        return 0.6; // Medium compression for smaller files
      case "1080p":
        return 0.8; // Lower compression but still smaller than before
      default:
        return 0.4;
    }
  }

  /**
   * Convert data URL to file URI for processing
   */
  static async dataUrlToFileUri(dataUrl: string): Promise<string> {
    try {
      const base64Data = dataUrl.split(",")[1];
      if (!base64Data) {
        throw new Error("Invalid data URL format");
      }

      const fileName = `temp_image_${Date.now()}.jpg`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: 'base64' as const,
      });

      return fileUri;
    } catch (error) {
      console.error("Error converting data URL to file URI:", error);
      throw new Error("Failed to prepare image for processing");
    }
  }

  /**
   * Clean up temporary files
   */
  static async cleanupTempFile(uri: string): Promise<void> {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        await FileSystem.deleteAsync(uri);
      }
    } catch (error) {
      console.warn("Failed to cleanup temp file:", error);
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  /**
   * Estimate file size for quality level (approximate)
   */
  static estimateFileSize(qualityId: string): string {
    switch (qualityId) {
      case "480p":
        return "~800KB";
      case "720p":
        return "~2MB";
      case "1080p":
        return "~4MB";
      default:
        return "~800KB";
    }
  }
}
