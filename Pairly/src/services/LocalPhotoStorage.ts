import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';

/**
 * Local Photo Storage Service
 * Stores photos locally in encrypted folder
 * Photos are NOT stored in database, only locally on device
 */

const PHOTOS_DIR = `${FileSystem.documentDirectory}pairly_photos/`;
const ENCRYPTED_DIR = `${FileSystem.documentDirectory}.pairly_secure/`;

interface PhotoMetadata {
  id: string;
  fileName: string;
  timestamp: Date;
  sender: 'me' | 'partner';
  encrypted: boolean;
}

class LocalPhotoStorage {
  /**
   * Initialize storage directories
   */
  async initialize(): Promise<void> {
    try {
      // Create photos directory
      const photosInfo = await FileSystem.getInfoAsync(PHOTOS_DIR);
      if (!photosInfo.exists) {
        await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
        console.log('✅ Photos directory created');
      }

      // Create encrypted directory (hidden)
      const encryptedInfo = await FileSystem.getInfoAsync(ENCRYPTED_DIR);
      if (!encryptedInfo.exists) {
        await FileSystem.makeDirectoryAsync(ENCRYPTED_DIR, { intermediates: true });
        console.log('✅ Encrypted directory created');
      }
    } catch (error) {
      console.error('❌ Error initializing storage:', error);
    }
  }

  /**
   * Save photo locally
   */
  async savePhoto(
    photoUri: string,
    sender: 'me' | 'partner',
    encrypt: boolean = false
  ): Promise<string | null> {
    try {
      await this.initialize();

      // Generate unique ID
      const photoId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${Date.now()}_${Math.random()}`
      );

      const fileName = `photo_${photoId}.jpg`;
      const targetDir = encrypt ? ENCRYPTED_DIR : PHOTOS_DIR;
      const targetPath = `${targetDir}${fileName}`;

      // Copy photo to local storage
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
        encrypted: encrypt,
      };

      await this.saveMetadata(photoId, metadata);

      console.log('✅ Photo saved locally:', fileName);
      return photoId;
    } catch (error) {
      console.error('❌ Error saving photo:', error);
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

      const dir = metadata.encrypted ? ENCRYPTED_DIR : PHOTOS_DIR;
      const photoPath = `${dir}${metadata.fileName}`;

      const info = await FileSystem.getInfoAsync(photoPath);
      if (!info.exists) return null;

      return photoPath;
    } catch (error) {
      console.error('❌ Error getting photo:', error);
      return null;
    }
  }

  /**
   * Get all photos
   */
  async getAllPhotos(): Promise<PhotoMetadata[]> {
    try {
      const metadataPath = `${PHOTOS_DIR}metadata.json`;
      const info = await FileSystem.getInfoAsync(metadataPath);

      if (!info.exists) return [];

      const content = await FileSystem.readAsStringAsync(metadataPath);
      const allMetadata = JSON.parse(content);

      return Object.values(allMetadata);
    } catch (error) {
      console.error('❌ Error getting all photos:', error);
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

      const dir = metadata.encrypted ? ENCRYPTED_DIR : PHOTOS_DIR;
      const photoPath = `${dir}${metadata.fileName}`;

      // Delete photo file
      await FileSystem.deleteAsync(photoPath, { idempotent: true });

      // Remove metadata
      await this.removeMetadata(photoId);

      console.log('✅ Photo deleted:', photoId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting photo:', error);
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
      
      // Delete encrypted directory
      await FileSystem.deleteAsync(ENCRYPTED_DIR, { idempotent: true });

      // Recreate directories
      await this.initialize();

      console.log('✅ All photos deleted');
      return true;
    } catch (error) {
      console.error('❌ Error deleting all photos:', error);
      return false;
    }
  }

  /**
   * Get storage size
   */
  async getStorageSize(): Promise<number> {
    try {
      let totalSize = 0;

      // Get photos directory size
      const photos = await FileSystem.readDirectoryAsync(PHOTOS_DIR);
      for (const photo of photos) {
        const info = await FileSystem.getInfoAsync(`${PHOTOS_DIR}${photo}`);
        if (info.exists && !info.isDirectory) {
          totalSize += info.size || 0;
        }
      }

      // Get encrypted directory size
      const encrypted = await FileSystem.readDirectoryAsync(ENCRYPTED_DIR);
      for (const photo of encrypted) {
        const info = await FileSystem.getInfoAsync(`${ENCRYPTED_DIR}${photo}`);
        if (info.exists && !info.isDirectory) {
          totalSize += info.size || 0;
        }
      }

      return totalSize;
    } catch (error) {
      console.error('❌ Error getting storage size:', error);
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
   * Get metadata
   */
  private async getMetadata(photoId: string): Promise<PhotoMetadata | null> {
    try {
      const metadataPath = `${PHOTOS_DIR}metadata.json`;
      const info = await FileSystem.getInfoAsync(metadataPath);

      if (!info.exists) return null;

      const content = await FileSystem.readAsStringAsync(metadataPath);
      const allMetadata = JSON.parse(content);

      return allMetadata[photoId] || null;
    } catch (error) {
      console.error('❌ Error getting metadata:', error);
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
      console.error('❌ Error removing metadata:', error);
    }
  }
}

export default new LocalPhotoStorage();
