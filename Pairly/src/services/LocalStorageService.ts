/**
 * Local Storage Service - Manages local photo storage and metadata
 * Photos are stored on device, not in cloud
 */

import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocalPhoto {
  id: string;
  uri: string;
  timestamp: number;
  sender: 'me' | 'partner';
  partnerName?: string;
  caption?: string;
  reaction?: string;
  isDownloaded: boolean;
}

class LocalStorageService {
  private photosDir = FileSystem.documentDirectory + 'pairly_photos/';
  private metadataKey = 'pairly_photos_metadata';

  /**
   * Initialize storage - create photos directory
   */
  async initialize(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.photosDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.photosDir, { intermediates: true });
        console.log('Photos directory created:', this.photosDir);
      }
    } catch (error) {
      console.error('Error initializing local storage:', error);
      throw error;
    }
  }

  /**
   * Save photo to local storage
   */
  async savePhoto(
    photoUri: string, 
    sender: 'me' | 'partner',
    options?: {
      caption?: string;
      partnerName?: string;
    }
  ): Promise<LocalPhoto> {
    try {
      await this.initialize();

      // Generate unique ID
      const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fileName = `${photoId}.jpg`;
      const destinationUri = this.photosDir + fileName;

      // Copy photo to permanent location
      await FileSystem.copyAsync({
        from: photoUri,
        to: destinationUri,
      });

      // Create metadata
      const photo: LocalPhoto = {
        id: photoId,
        uri: destinationUri,
        timestamp: Date.now(),
        sender,
        partnerName: options?.partnerName,
        caption: options?.caption,
        isDownloaded: true,
      };

      // Save metadata
      await this.savePhotoMetadata(photo);

      console.log('Photo saved locally:', photoId);
      return photo;

    } catch (error) {
      console.error('Error saving photo:', error);
      throw error;
    }
  }

  /**
   * Get all photos from local storage
   */
  async getPhotos(): Promise<LocalPhoto[]> {
    try {
      const metadataJson = await AsyncStorage.getItem(this.metadataKey);
      
      if (!metadataJson) {
        return [];
      }

      const photos: LocalPhoto[] = JSON.parse(metadataJson);
      
      // Sort by timestamp (newest first)
      return photos.sort((a, b) => b.timestamp - a.timestamp);

    } catch (error) {
      console.error('Error getting photos:', error);
      return [];
    }
  }

  /**
   * Get photo by ID
   */
  async getPhotoById(photoId: string): Promise<LocalPhoto | null> {
    try {
      const photos = await this.getPhotos();
      return photos.find(p => p.id === photoId) || null;
    } catch (error) {
      console.error('Error getting photo by ID:', error);
      return null;
    }
  }

  /**
   * Delete photo from local storage
   */
  async deletePhoto(photoId: string): Promise<boolean> {
    try {
      const photo = await this.getPhotoById(photoId);
      
      if (!photo) {
        console.warn('Photo not found:', photoId);
        return false;
      }

      // Delete file
      await FileSystem.deleteAsync(photo.uri, { idempotent: true });

      // Remove from metadata
      const photos = await this.getPhotos();
      const updatedPhotos = photos.filter(p => p.id !== photoId);
      await AsyncStorage.setItem(this.metadataKey, JSON.stringify(updatedPhotos));

      console.log('Photo deleted:', photoId);
      return true;

    } catch (error) {
      console.error('Error deleting photo:', error);
      return false;
    }
  }

  /**
   * Update photo metadata (caption, reaction, etc.)
   */
  async updatePhotoMetadata(photoId: string, updates: Partial<LocalPhoto>): Promise<boolean> {
    try {
      const photos = await this.getPhotos();
      const photoIndex = photos.findIndex(p => p.id === photoId);

      if (photoIndex === -1) {
        console.warn('Photo not found:', photoId);
        return false;
      }

      // Update photo
      photos[photoIndex] = {
        ...photos[photoIndex],
        ...updates,
      };

      // Save updated metadata
      await AsyncStorage.setItem(this.metadataKey, JSON.stringify(photos));

      console.log('Photo metadata updated:', photoId);
      return true;

    } catch (error) {
      console.error('Error updating photo metadata:', error);
      return false;
    }
  }

  /**
   * Add reaction to photo
   */
  async addReaction(photoId: string, reaction: string): Promise<boolean> {
    return this.updatePhotoMetadata(photoId, { reaction });
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalPhotos: number;
    totalSize: number;
    myPhotos: number;
    partnerPhotos: number;
  }> {
    try {
      const photos = await this.getPhotos();
      let totalSize = 0;

      // Calculate total size
      for (const photo of photos) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(photo.uri);
          if (fileInfo.exists && 'size' in fileInfo) {
            totalSize += fileInfo.size;
          }
        } catch (error) {
          console.warn('Error getting file size:', photo.id);
        }
      }

      return {
        totalPhotos: photos.length,
        totalSize,
        myPhotos: photos.filter(p => p.sender === 'me').length,
        partnerPhotos: photos.filter(p => p.sender === 'partner').length,
      };

    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalPhotos: 0,
        totalSize: 0,
        myPhotos: 0,
        partnerPhotos: 0,
      };
    }
  }

  /**
   * Clear all photos (for testing or account deletion)
   */
  async clearAllPhotos(): Promise<boolean> {
    try {
      // Delete directory
      await FileSystem.deleteAsync(this.photosDir, { idempotent: true });
      
      // Clear metadata
      await AsyncStorage.removeItem(this.metadataKey);

      // Recreate directory
      await this.initialize();

      console.log('All photos cleared');
      return true;

    } catch (error) {
      console.error('Error clearing photos:', error);
      return false;
    }
  }

  /**
   * Save photo metadata to AsyncStorage
   */
  private async savePhotoMetadata(photo: LocalPhoto): Promise<void> {
    try {
      const photos = await this.getPhotos();
      photos.push(photo);
      await AsyncStorage.setItem(this.metadataKey, JSON.stringify(photos));
    } catch (error) {
      console.error('Error saving photo metadata:', error);
      throw error;
    }
  }

  /**
   * Export photos for backup
   */
  async exportPhotos(): Promise<string> {
    try {
      const photos = await this.getPhotos();
      return JSON.stringify(photos, null, 2);
    } catch (error) {
      console.error('Error exporting photos:', error);
      throw error;
    }
  }

  /**
   * Import photos from backup
   */
  async importPhotos(backupJson: string): Promise<boolean> {
    try {
      const photos: LocalPhoto[] = JSON.parse(backupJson);
      await AsyncStorage.setItem(this.metadataKey, JSON.stringify(photos));
      console.log('Photos imported:', photos.length);
      return true;
    } catch (error) {
      console.error('Error importing photos:', error);
      return false;
    }
  }
}

export default new LocalStorageService();
