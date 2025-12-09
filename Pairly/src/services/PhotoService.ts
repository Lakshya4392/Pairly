import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Alert, Linking } from 'react-native';
import { PhotoAsset, CompressedPhoto } from '@types';

const qualitySettings = {
  default: {
    maxFileSize: 1 * 1024 * 1024, // ⚡ IMPROVED: 1MB (increased from 500KB)
    maxWidth: 1080,
    maxHeight: 1920,
    jpegQuality: 0.85,
    minQuality: 0.3, // ⚡ NEW: Minimum quality threshold
  },
  premium: {
    maxFileSize: 2 * 1024 * 1024, // 2MB
    maxWidth: 1920,
    maxHeight: 1920,
    jpegQuality: 0.95,
    minQuality: 0.5, // ⚡ NEW: Minimum quality threshold
  },
};

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
  /**
   * Capture photo from camera
   */
  async capturePhoto(): Promise<PhotoAsset | null> {
    try {
      console.log('📸 Requesting camera permissions...');

      // 1. Request Camera permission
      const cameraStatus = await this.requestCameraPermission();
      if (!cameraStatus) {
        Alert.alert(
          'Permission Required',
          'Camera permission is required. Please enable it in settings or use the Gallery.',
          [
            { text: 'OK' },
            { text: 'Open Settings', onPress: () => Platform.OS === 'ios' ? Linking.openURL('app-settings:') : Linking.openSettings() }
          ]
        );
        return null;
      }

      // 2. Request Media permission (Android often needs this to save the result)
      if (Platform.OS === 'android') {
        const mediaStatus = await this.requestMediaLibraryPermission();
        if (!mediaStatus) {
          console.warn('⚠️ Media permission missing on Android - camera might fail to save');
        }
      }

      console.log('📸 Launching camera...');

      // 3. Launch camera with crash-safe options
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // ⚡ SAFE MODE: Editing causes crashes on some Androids
        quality: 1,
        // aspect: [4, 3], // Removed when allowsEditing is false
      });

      console.log('📸 Camera result:', result.canceled ? 'Canceled' : 'Captured');

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      return this.convertToPhotoAsset(asset);
    } catch (error: any) {
      console.error('❌ Error capturing photo:', error);

      // ⚡ FALLBACK: Suggest gallery if camera crashes
      Alert.alert(
        'Camera Error',
        'Could not open camera. Would you like to pick from Gallery instead?',
        [
          { text: 'No, Cancel', style: 'cancel' },
          { text: 'Yes, Open Gallery', onPress: () => this.selectFromGallery().then(() => { }) } // Handled by caller usually, but this is a deep fallback
        ]
      );
      return null;
    }
  }

  /**
   * Select photo from gallery
   */
  async selectFromGallery(): Promise<PhotoAsset | null> {
    try {
      console.log('📸 Requesting media library permission...');

      // Request permission
      const hasPermission = await this.requestMediaLibraryPermission();
      console.log('📸 Permission granted:', hasPermission);

      if (!hasPermission) {
        console.error('❌ Media library permission denied');
        Alert.alert('Permission Required', 'Media library permission is required to select photos.');
        return null;
      }

      console.log('📸 Launching image library...');

      // Launch image library
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // ⚡ FIXED: Don't force editing - causes issues on some devices
        quality: 1, // Always select at full quality
      });

      console.log('📸 Image picker result:', {
        canceled: result.canceled,
        assetsCount: result.assets?.length
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('⚠️ User cancelled or no assets selected');
        return null;
      }

      const asset = result.assets[0];
      console.log('✅ Photo selected:', asset.uri);
      return this.convertToPhotoAsset(asset);
    } catch (error) {
      console.error('❌ Error selecting photo:', error);
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
  async compressPhoto(
    photoAsset: PhotoAsset,
    quality: 'default' | 'premium' = 'default'
  ): Promise<CompressedPhoto> {
    try {
      const settings = qualitySettings[quality];

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(photoAsset.uri);
      if (!fileInfo.exists) {
        throw new Error('Photo file does not exist');
      }

      let manipulatedImage = photoAsset.uri;
      let currentQuality = settings.jpegQuality;

      // Resize if dimensions are too large
      if (photoAsset.width > settings.maxWidth || photoAsset.height > settings.maxHeight) {
        const result = await ImageManipulator.manipulateAsync(
          photoAsset.uri,
          [
            {
              resize: {
                width: Math.min(photoAsset.width, settings.maxWidth),
                height: Math.min(photoAsset.height, settings.maxHeight),
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

      // ⚡ IMPROVED: Compress until file size is acceptable with better fallback
      let attempts = 0;
      const maxAttempts = 8; // Increased from 5
      let lastResult: any = null;

      while (attempts < maxAttempts) {
        const result = await ImageManipulator.manipulateAsync(
          manipulatedImage,
          [],
          {
            compress: currentQuality,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        lastResult = result;
        const compressedFileInfo = await FileSystem.getInfoAsync(result.uri);
        const fileSize = (compressedFileInfo as any).size || 0;

        console.log(`Compression attempt ${attempts + 1}: ${Math.round(fileSize / 1024)}KB at quality ${currentQuality.toFixed(2)}`);

        if (fileSize <= settings.maxFileSize) {
          // Convert to base64
          const base64 = await FileSystem.readAsStringAsync(result.uri, {
            encoding: 'base64' as any,
          });

          console.log(`✅ Photo compressed successfully: ${Math.round(fileSize / 1024)}KB`);
          return {
            base64,
            mimeType: 'image/jpeg',
            size: fileSize,
          };
        }

        // Reduce quality for next attempt
        currentQuality *= 0.75; // Slower reduction (was 0.8)
        attempts++;

        // Stop if quality is too low
        if (currentQuality < settings.minQuality) {
          console.log(`⚠️ Reached minimum quality threshold: ${settings.minQuality}`);
          break;
        }
      }

      // ⚡ IMPROVED: If all attempts failed, use last result anyway (best effort)
      if (lastResult) {
        console.log('⚠️ Using best effort compression (may exceed size limit)');
        const base64 = await FileSystem.readAsStringAsync(lastResult.uri, {
          encoding: 'base64' as any,
        });
        const fileInfo = await FileSystem.getInfoAsync(lastResult.uri);
        const fileSize = (fileInfo as any).size || 0;

        console.log(`📤 Sending photo at ${Math.round(fileSize / 1024)}KB (best effort)`);
        return {
          base64,
          mimeType: 'image/jpeg',
          size: fileSize,
        };
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