import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Alert } from 'react-native';
import { PhotoAsset, CompressedPhoto } from '@types';

const MAX_FILE_SIZE = 500 * 1024; // 500KB
const MAX_WIDTH = 1080;
const MAX_HEIGHT = 1920;
const JPEG_QUALITY = 0.85;

class PhotoService {
  /**
   * Request camera permissions
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  }

  /**
   * Request media library permissions
   */
  async requestMediaLibraryPermission(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting media library permission:', error);
      return false;
    }
  }

  /**
   * Capture photo from camera
   */
  async capturePhoto(): Promise<PhotoAsset | null> {
    try {
      // Request permission
      const hasPermission = await this.requestCameraPermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return null;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      return this.convertToPhotoAsset(asset);
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
      return null;
    }
  }

  /**
   * Select photo from gallery
   */
  async selectFromGallery(): Promise<PhotoAsset | null> {
    try {
      // Request permission
      const hasPermission = await this.requestMediaLibraryPermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Media library permission is required to select photos.');
        return null;
      }

      // Launch image library
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      return this.convertToPhotoAsset(asset);
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Error', 'Failed to select photo. Please try again.');
      return null;
    }
  }

  /**
   * Convert ImagePicker asset to PhotoAsset
   */
  private convertToPhotoAsset(asset: ImagePicker.ImagePickerAsset): PhotoAsset {
    return {
      uri: asset.uri,
      type: asset.type || 'image/jpeg',
      fileName: asset.fileName || `photo_${Date.now()}.jpg`,
      fileSize: asset.fileSize || 0,
      width: asset.width || 0,
      height: asset.height || 0,
    };
  }

  /**
   * Compress photo to meet size requirements
   */
  async compressPhoto(photoAsset: PhotoAsset): Promise<CompressedPhoto> {
    try {
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(photoAsset.uri);
      if (!fileInfo.exists) {
        throw new Error('Photo file does not exist');
      }

      let manipulatedImage = photoAsset.uri;
      let currentQuality = JPEG_QUALITY;

      // Resize if dimensions are too large
      if (photoAsset.width > MAX_WIDTH || photoAsset.height > MAX_HEIGHT) {
        const result = await ImageManipulator.manipulateAsync(
          photoAsset.uri,
          [
            {
              resize: {
                width: Math.min(photoAsset.width, MAX_WIDTH),
                height: Math.min(photoAsset.height, MAX_HEIGHT),
              },
            },
          ],
          {
            compress: currentQuality,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );
        manipulatedImage = result.uri;
      }

      // Compress until file size is acceptable
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        const result = await ImageManipulator.manipulateAsync(
          manipulatedImage,
          [],
          {
            compress: currentQuality,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        const compressedFileInfo = await FileSystem.getInfoAsync(result.uri);
        const fileSize = (compressedFileInfo as any).size || 0;

        if (fileSize <= MAX_FILE_SIZE) {
          // Convert to base64
          const base64 = await FileSystem.readAsStringAsync(result.uri, {
            encoding: 'base64' as any,
          });

          return {
            base64,
            mimeType: 'image/jpeg',
            size: fileSize,
          };
        }

        // Reduce quality for next attempt
        currentQuality *= 0.8;
        attempts++;

        if (currentQuality < 0.1) {
          break;
        }
      }

      throw new Error('Unable to compress photo to required size');
    } catch (error) {
      console.error('Error compressing photo:', error);
      throw error;
    }
  }

  /**
   * Show photo selection options
   */
  async showPhotoOptions(): Promise<PhotoAsset | null> {
    return new Promise((resolve) => {
      Alert.alert(
        'Select Photo',
        'Choose how you want to add a photo',
        [
          {
            text: 'Camera',
            onPress: async () => {
              const photo = await this.capturePhoto();
              resolve(photo);
            },
          },
          {
            text: 'Gallery',
            onPress: async () => {
              const photo = await this.selectFromGallery();
              resolve(photo);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(null),
          },
        ],
        { cancelable: true, onDismiss: () => resolve(null) }
      );
    });
  }

  /**
   * Validate photo asset
   */
  validatePhoto(photoAsset: PhotoAsset): { isValid: boolean; error?: string } {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(photoAsset.type.toLowerCase())) {
      return {
        isValid: false,
        error: 'Only JPEG and PNG images are supported',
      };
    }

    // Check file size (before compression)
    const maxOriginalSize = 10 * 1024 * 1024; // 10MB
    if (photoAsset.fileSize > maxOriginalSize) {
      return {
        isValid: false,
        error: 'Image file is too large (max 10MB)',
      };
    }

    // Check dimensions
    const maxDimension = 4096;
    if (photoAsset.width > maxDimension || photoAsset.height > maxDimension) {
      return {
        isValid: false,
        error: `Image dimensions too large (max ${maxDimension}px)`,
      };
    }

    return { isValid: true };
  }
}

export default new PhotoService();