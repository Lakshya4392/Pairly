import { Platform, NativeModules } from 'react-native';
import * as FileSystem from 'expo-file-system';

const { SharedPrefsModule } = NativeModules;

/**
 * Service to handle Widget Updates (Background & Foreground)
 * ensuring logic is consistent across Socket and FCM handlers.
 */
export const WidgetUpdateService = {
    /**
     * Downloads photo and triggers Native Widget Update
     */
    async updateWidgetWithPhoto(photoUrl: string, partnerName: string): Promise<boolean> {
        if (Platform.OS !== 'android') {
            return false;
        }

        if (!photoUrl) {
            console.log('⚠️ [WidgetUpdate] No photoUrl provided');
            return false;
        }

        try {
            console.log('📥 [WidgetUpdate] Starting download:', photoUrl);

            // Use consistent file name to overwrite old photo
            const fileName = 'widget_moment_latest.jpg';

            // Handle Expo FileSystem types safely
            const fs = FileSystem as any;
            const docDir = fs.documentDirectory || fs.cacheDirectory;
            const localUri = `${docDir}${fileName}`;

            // Download file
            const downloadResult = await FileSystem.downloadAsync(photoUrl, localUri);

            if (downloadResult.status === 200) {
                if (!SharedPrefsModule) {
                    console.error('❌ [WidgetUpdate] SharedPrefsModule not found');
                    return false;
                }

                // Clean path for Native File(...) usage
                const cleanPath = downloadResult.uri.replace('file://', '');

                // 1. Update SharedPreferences
                await SharedPrefsModule.setString('last_moment_path', cleanPath);
                await SharedPrefsModule.setString('last_moment_timestamp', Date.now().toString());
                await SharedPrefsModule.setString('last_moment_sender', partnerName || 'Partner');

                // 2. Trigger Native Direct Update
                await SharedPrefsModule.notifyWidgetUpdate();

                console.log('✅ [WidgetUpdate] Widget updated successfully via Native Module');
                return true;
            }

            console.log('⚠️ [WidgetUpdate] Download failed status:', downloadResult.status);
            return false;
        } catch (error) {
            console.error('❌ [WidgetUpdate] Failed:', error);
            return false;
        }
    }
};
