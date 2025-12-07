import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';

/**
 * ⚡ SIMPLE & CLEAN: Local Photo Storage
 * Stores photos locally on device (NOT in database)
 * Single directory, no encryption complexity
 */

const PHOTOS_DIR = `${FileSystem.documentDirectory}pairly_photos/`;

interface PhotoMetadata {
  id: string;
  fileName: string;
  timestamp: Date;
  sender: 'me' | 'partner';
}

class LocalPhotoStorage {
  /**
   * Initialize storage directory
   */
  async initialize(): Promise<void> {
    try {
      const photosInfo = await FileSystem.getInfoAsync(PHOTOS_DIR);
      if (!photosInfo.exists) {
        await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
        console.log('✅ [STORAGE] Photos directory created');
      }
    } catch (error) {
      console.error('❌ [STORAGE] Error initializing:', error);
    }
  }

  /**
   * ⚡ SIMPLE: Save photo locally
   */
  async savePhoto(
    photoUri: string,
    sender: 'me' | 'partner'
  ): Promise<string | null> {
    try {
      await this.initialize();

      // Generate unique ID
      const photoId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${Date.now()}_${Math.random()}`
      );

      const fileName = `photo_${photoId}.jpg`;
      const targetPath = `${PHOTOS_DIR}${fileName}`;

      // Copy photo to storage
      await FileSystem.copyAsync({
        from: photoUri,
        to: targetPath,
      });

      // Save metadata
      const metadata: PhotoMetadata = {
        id: photoId,
        fileName,
        timestamp: new Date(),
        sender,
      };

      await this.saveMetadata(photoId, metadata);

      console.log(`✅ [STORAGE] Saved ${sender === 'me' ? '👤 My' : '❤️ Partner'} photo:`, photoId.substring(0, 8));
      return photoId;
    } catch (error) {
      console.error('❌ [STORAGE] Error saving photo:', error);
      return null;
    }
  }

  /**
   * Get photo URI by ID
   */
  async getPhotoUri(photoId: string): Promise<string | null> {
    try {
      const metadata = await this.getMetadata(photoId);
      if (!metadata) return null;

      const photoPath = `${PHOTOS_DIR}${metadata.fileName}`;

      const info = await FileSystem.getInfoAsync(photoPath);
      if (!info.exists) return null;

      return photoPath;
    } catch (error) {
      console.error('❌ [STORAGE] Error getting photo:', error);
      return null;
    }
  }

  /**
   * Get all photos (with automatic cleanup of old encrypted field)
   */
  async getAllPhotos(): Promise<PhotoMetadata[]> {
    try {
      const metadataPath = `${PHOTOS_DIR}metadata.json`;
      const info = await FileSystem.getInfoAsync(metadataPath);

      if (!info.exists) {
        console.log('📊 [STORAGE] No photos yet');
        return [];
      }

      const content = await FileSystem.readAsStringAsync(metadataPath);
      const allMetadata = JSON.parse(content);
      
      // ⚡ IMMEDIATE FIX: Clean metadata on-the-fly
      const cleanedPhotos: PhotoMetadata[] = [];
      for (const rawData of Object.values(allMetadata)) {
        const data = rawData as any;
        cleanedPhotos.push({
          id: data.id,
          fileName: data.fileName,
          timestamp: data.timestamp,
          sender: data.sender,
        });
      }

      console.log(`📊 [STORAGE] Total photos: ${cleanedPhotos.length}`);
      return cleanedPhotos;
    } catch (error) {
      console.error('❌ [STORAGE] Error getting all photos:', error);
      return [];
    }
  }

  /**
   * Delete photo
   */
  async deletePhoto(photoId: string): Promise<boolean> {
    try {
      const metadata = await this.getMetadata(photoId);
      if (!metadata) return false;

      const photoPath = `${PHOTOS_DIR}${metadata.fileName}`;

      // Delete photo file
      await FileSystem.deleteAsync(photoPath, { idempotent: true });

      // Remove metadata
      await this.removeMetadata(photoId);

      console.log('✅ [STORAGE] Photo deleted:', photoId.substring(0, 8));
      return true;
    } catch (error) {
      console.error('❌ [STORAGE] Error deleting photo:', error);
      return false;
    }
  }

  /**
   * Delete all photos
   */
  async deleteAllPhotos(): Promise<boolean> {
    try {
      // Delete photos directory
      await FileSystem.deleteAsync(PHOTOS_DIR, { idempotent: true });

      // Recreate directory
      await this.initialize();

      console.log('✅ [STORAGE] All photos deleted');
      return true;
    } catch (error) {
      console.error('❌ [STORAGE] Error deleting all photos:', error);
      return false;
    }
  }

  /**
   * Get storage size
   */
  async getStorageSize(): Promise<number> {
    try {
      // Ensure directory exists before reading
      await this.initialize();
      
      let totalSize = 0;

      const photos = await FileSystem.readDirectoryAsync(PHOTOS_DIR);
      for (const photo of photos) {
        const info = await FileSystem.getInfoAsync(`${PHOTOS_DIR}${photo}`);
        if (info.exists && !info.isDirectory) {
          totalSize += info.size || 0;
        }
      }

      console.log(`📊 [STORAGE] Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      return totalSize;
    } catch (error) {
      // Silent error - just return 0
      return 0;
    }
  }

  /**
   * Save metadata
   */
  private async saveMetadata(photoId: string, metadata: PhotoMetadata): Promise<void> {
    try {
      const metadataPath = `${PHOTOS_DIR}metadata.json`;
      
      let allMetadata: Record<string, PhotoMetadata> = {};
      
      const info = await FileSystem.getInfoAsync(metadataPath);
      if (info.exists) {
        const content = await FileSystem.readAsStringAsync(metadataPath);
        allMetadata = JSON.parse(content);
      }

      allMetadata[photoId] = metadata;

      await FileSystem.writeAsStringAsync(
        metadataPath,
        JSON.stringify(allMetadata)
      );
    } catch (error) {
      console.error('❌ Error saving metadata:', error);
    }
  }

  /**
   * Get metadata (with backward compatibility for old encrypted field)
   */
  private async getMetadata(photoId: string): Promise<PhotoMetadata | null> {
    try {
      const metadataPath = `${PHOTOS_DIR}metadata.json`;
      const info = await FileSystem.getInfoAsync(metadataPath);

      if (!info.exists) return null;

      const content = await FileSystem.readAsStringAsync(metadataPath);
      const allMetadata = JSON.parse(content);
      const rawMetadata = allMetadata[photoId];

      if (!rawMetadata) return null;

      // ⚡ FIX: Remove old 'encrypted' field if it exists
      const cleanMetadata: PhotoMetadata = {
        id: rawMetadata.id,
        fileName: rawMetadata.fileName,
        timestamp: rawMetadata.timestamp,
        sender: rawMetadata.sender,
      };

      return cleanMetadata;
    } catch (error) {
      console.error('❌ [STORAGE] Error getting metadata:', error);
      return null;
    }
  }

  /**
   * Remove metadata
   */
  private async removeMetadata(photoId: string): Promise<void> {
    try {
      const metadataPath = `${PHOTOS_DIR}metadata.json`;
      const info = await FileSystem.getInfoAsync(metadataPath);

      if (!info.exists) return;

      const content = await FileSystem.readAsStringAsync(metadataPath);
      const allMetadata = JSON.parse(content);

      delete allMetadata[photoId];

      await FileSystem.writeAsStringAsync(
        metadataPath,
        JSON.stringify(allMetadata)
      );
    } catch (error) {
      console.error('❌ [STORAGE] Error removing metadata:', error);
    }
  }

  /**
   * ⚡ CLEANUP: Remove old encrypted field from metadata (FORCE)
   */
  async cleanupOldMetadata(): Promise<void> {
    try {
      console.log('🧹 [STORAGE] Starting metadata cleanup...');
      
      const metadataPath = `${PHOTOS_DIR}metadata.json`;
      const info = await FileSystem.getInfoAsync(metadataPath);

      if (!info.exists) {
        console.log('📊 [STORAGE] No metadata file found');
        return;
      }

      const content = await FileSystem.readAsStringAsync(metadataPath);
      const allMetadata = JSON.parse(content);

      let cleanedCount = 0;
      const cleanedMetadata: Record<string, PhotoMetadata> = {};

      // Clean each metadata entry
      for (const [photoId, rawData] of Object.entries(allMetadata)) {
        const data = rawData as any;
        
        // Remove 'encrypted' field if it exists
        if ('encrypted' in data) {
          cleanedCount++;
          console.log(`🧹 [STORAGE] Cleaning photo: ${photoId.substring(0, 8)} (encrypted: ${data.encrypted})`);
        }

        cleanedMetadata[photoId] = {
          id: data.id,
          fileName: data.fileName,
          timestamp: data.timestamp,
          sender: data.sender,
        };
      }

      // ALWAYS save cleaned metadata (force overwrite)
      await FileSystem.writeAsStringAsync(
        metadataPath,
        JSON.stringify(cleanedMetadata, null, 2)
      );
      
      console.log(`✅ [STORAGE] Metadata cleanup complete! Cleaned ${cleanedCount} entries, saved ${Object.keys(cleanedMetadata).length} total`);
    } catch (error) {
      console.error('❌ [STORAGE] Error cleaning metadata:', error);
    }
  }
}

export default new LocalPhotoStorage();
