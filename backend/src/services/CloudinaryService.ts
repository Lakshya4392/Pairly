import { v2 as cloudinary } from 'cloudinary';

/**
 * CloudinaryService - Handles image uploads to Cloudinary
 * Free tier: 25GB storage, 25K monthly transformations
 */
class CloudinaryService {
    private initialized = false;

    /**
     * Initialize Cloudinary with credentials
     */
    initialize() {
        if (this.initialized) {
            return;
        }

        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;

        if (!cloudName || !apiKey || !apiSecret) {
            console.log('⚠️ Cloudinary credentials not configured - using local storage fallback');
            return;
        }

        cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
        });

        this.initialized = true;
        console.log('✅ Cloudinary initialized');
    }

    /**
     * Check if Cloudinary is configured
     */
    isConfigured(): boolean {
        return this.initialized;
    }

    /**
     * Upload image buffer to Cloudinary
     * Returns the secure URL for the uploaded image
     */
    async uploadImage(
        buffer: Buffer,
        options?: {
            folder?: string;
            publicId?: string;
            transformation?: object[];
        }
    ): Promise<{ url: string; publicId: string } | null> {
        if (!this.initialized) {
            console.log('⚠️ Cloudinary not initialized, skipping upload');
            return null;
        }

        try {
            // Convert buffer to base64 data URI
            const base64Data = `data:image/jpeg;base64,${buffer.toString('base64')}`;

            const uploadResult = await cloudinary.uploader.upload(base64Data, {
                folder: options?.folder || 'pairly/moments',
                public_id: options?.publicId,
                resource_type: 'image',
                transformation: options?.transformation || [
                    { width: 1080, height: 1920, crop: 'limit' },
                    { quality: 'auto:good' },
                ],
                // Optimize for widget delivery
                eager: [
                    { width: 400, height: 400, crop: 'fill', quality: 'auto:good' }, // Widget thumbnail
                ],
            });

            console.log(`✅ Cloudinary upload successful: ${uploadResult.public_id}`);
            console.log(`   📏 Size: ${(uploadResult.bytes / 1024).toFixed(2)} KB`);
            console.log(`   🔗 URL: ${uploadResult.secure_url}`);

            return {
                url: uploadResult.secure_url,
                publicId: uploadResult.public_id,
            };
        } catch (error: any) {
            console.error('❌ Cloudinary upload error:', error.message);
            return null;
        }
    }

    /**
     * Delete image from Cloudinary
     */
    async deleteImage(publicId: string): Promise<boolean> {
        if (!this.initialized) {
            return false;
        }

        try {
            await cloudinary.uploader.destroy(publicId);
            console.log(`🗑️ Cloudinary image deleted: ${publicId}`);
            return true;
        } catch (error: any) {
            console.error('❌ Cloudinary delete error:', error.message);
            return false;
        }
    }

    /**
     * Get optimized URL for widget (smaller size, faster load)
     */
    getWidgetUrl(originalUrl: string): string {
        if (!originalUrl.includes('cloudinary.com')) {
            return originalUrl;
        }

        // Transform URL to use widget-optimized version
        // Example: .../upload/v123/... -> .../upload/w_400,h_400,c_fill,q_auto/v123/...
        return originalUrl.replace('/upload/', '/upload/w_400,h_400,c_fill,q_auto:good/');
    }
}

export default new CloudinaryService();
