import * as ImageManipulator from 'expo-image-manipulator';

export type FilterType = 
  | 'none'
  | 'grayscale'
  | 'sepia'
  | 'vintage'
  | 'warm'
  | 'cool'
  | 'bright'
  | 'contrast'
  | 'saturate'
  | 'fade';

export interface PhotoFilter {
  id: FilterType;
  name: string;
  isPremium: boolean;
  preview: string; // Preview image URL
}

export const availableFilters: PhotoFilter[] = [
  { id: 'none', name: 'Original', isPremium: false, preview: '' },
  { id: 'grayscale', name: 'B&W', isPremium: false, preview: '' },
  { id: 'sepia', name: 'Sepia', isPremium: true, preview: '' },
  { id: 'vintage', name: 'Vintage', isPremium: true, preview: '' },
  { id: 'warm', name: 'Warm', isPremium: true, preview: '' },
  { id: 'cool', name: 'Cool', isPremium: true, preview: '' },
  { id: 'bright', name: 'Bright', isPremium: true, preview: '' },
  { id: 'contrast', name: 'Contrast', isPremium: true, preview: '' },
  { id: 'saturate', name: 'Vibrant', isPremium: true, preview: '' },
  { id: 'fade', name: 'Fade', isPremium: true, preview: '' },
];

class PhotoFilterService {
  // Apply filter to image
  static async applyFilter(
    imageUri: string,
    filterType: FilterType
  ): Promise<string> {
    try {
      if (filterType === 'none') {
        return imageUri;
      }

      const actions = this.getFilterActions(filterType);
      
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        actions,
        {
          compress: 0.9,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return result.uri;
    } catch (error) {
      console.error('Error applying filter:', error);
      return imageUri;
    }
  }

  // Get filter actions based on type
  private static getFilterActions(filterType: FilterType): any[] {
    switch (filterType) {
      case 'grayscale':
        return []; // ImageManipulator doesn't have built-in grayscale, would need custom implementation

      case 'sepia':
        return []; // Would need custom implementation

      case 'vintage':
        return []; // Would need custom implementation

      case 'warm':
        return []; // Would need custom implementation

      case 'cool':
        return []; // Would need custom implementation

      case 'bright':
        return []; // Would need custom implementation

      case 'contrast':
        return []; // Would need custom implementation

      case 'saturate':
        return []; // Would need custom implementation

      case 'fade':
        return []; // Would need custom implementation

      default:
        return [];
    }
  }

  // Check if filter is available for user
  static isFilterAvailable(filterType: FilterType, isPremium: boolean): boolean {
    const filter = availableFilters.find(f => f.id === filterType);
    if (!filter) return false;
    
    return !filter.isPremium || isPremium;
  }

  // Get available filters for user
  static getAvailableFilters(isPremium: boolean): PhotoFilter[] {
    if (isPremium) {
      return availableFilters;
    }
    return availableFilters.filter(f => !f.isPremium);
  }
}

export default PhotoFilterService;
