/**
 * Image Compressor
 * Compresses images before upload to reduce transfer time and storage
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: 'jpeg' | 'png';
}

class ImageCompressor {
  private defaultOptions: CompressionOptions = {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.8,
    format: 'jpeg',
  };

  /**
   * Compress image
   */
  async compress(
    uri: string,
    options?: CompressionOptions
  ): Promise<{ uri: string; size: number; originalSize: number }> {
    try {
      const opts = { ...this.defaultOptions, ...options };

      // Get original file size
      const originalInfo = await FileSystem.getInfoAsync(uri);
      const originalSize = 'size' in originalInfo ? originalInfo.size : 0;

      console.log(`📸 Compressing image (${this.formatBytes(originalSize)})`);

      // Compress image
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: opts.maxWidth,
              height: opts.maxHeight,
            },
          },
        ],
        {
          compress: opts.quality,
          format: opts.format === 'jpeg' 
            ? ImageManipulator.SaveFormat.JPEG 
            : ImageManipulator.SaveFormat.PNG,
        }
      );

      // Get compressed file size
      const compressedInfo = await FileSystem.getInfoAsync(result.uri);
      const compressedSize = 'size' in compressedInfo ? compressedInfo.size : 0;

      const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
      console.log(`✅ Compressed: ${this.formatBytes(compressedSize)} (${savings}% smaller)`);

      return {
        uri: result.uri,
        size: compressedSize,
        originalSize,
      };

    } catch (error) {
      console.error('❌ Compression error:', error);
      // Return original if compression fails
      const originalInfo = await FileSystem.getInfoAsync(uri);
      const originalSize = 'size' in originalInfo ? originalInfo.size : 0;
      
      return {
        uri,
        size: originalSize,
        originalSize,
      };
    }
  }

  /**
   * Compress for thumbnail
   */
  async compressForThumbnail(uri: string): Promise<string> {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 300 } }],
        {
          compress: 0.6,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return result.uri;
    } catch (error) {
      console.error('Thumbnail compression error:', error);
      return uri;
    }
  }

  /**
   * Compress for widget
   */
  async compressForWidget(uri: string): Promise<string> {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 500 } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return result.uri;
    } catch (error) {
      console.error('Widget compression error:', error);
      return uri;
    }
  }

  /**
   * Get image dimensions
   */
  async getDimensions(uri: string): Promise<{ width: number; height: number }> {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      
      // For now, return default dimensions
      // In production, use expo-image-picker's image info
      return { width: 1920, height: 1920 };
    } catch (error) {
      console.error('Get dimensions error:', error);
      return { width: 0, height: 0 };
    }
  }

  /**
   * Check if image needs compression
   */
  async needsCompression(uri: string, maxSize: number = 5 * 1024 * 1024): Promise<boolean> {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      const size = 'size' in info ? info.size : 0;
      return size > maxSize;
    } catch (error) {
      console.error('Check compression error:', error);
      return false;
    }
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Batch compress multiple images
   */
  async compressBatch(
    uris: string[],
    options?: CompressionOptions
  ): Promise<Array<{ uri: string; size: number; originalSize: number }>> {
    const results = [];

    for (const uri of uris) {
      try {
        const result = await this.compress(uri, options);
        results.push(result);
      } catch (error) {
        console.error(`Error compressing ${uri}:`, error);
      }
    }

    return results;
  }
}

export default new ImageCompressor();
