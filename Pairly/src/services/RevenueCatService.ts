import Purchases, {
    CustomerInfo,
    PurchasesOffering,
    PurchasesPackage,
    LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import apiClient from './../utils/apiClient';

// 🔑 API KEYS (Ideally from .env, using placeholders for now if not set)
// You need to set these in your .env file:
// EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID
// EXPO_PUBLIC_REVENUECAT_API_KEY_IOS

const API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;
const API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS;

class RevenueCatService {
    private static instance: RevenueCatService;
    private isInitialized = false;

    private constructor() { }

    static getInstance(): RevenueCatService {
        if (!RevenueCatService.instance) {
            RevenueCatService.instance = new RevenueCatService();
        }
        return RevenueCatService.instance;
    }

    /**
     * Initialize RevenueCat SDK
     * Call this early in App.tsx
     */
    async init(userId?: string) {
        if (this.isInitialized) return;

        // Enable debug logs for development
        if (__DEV__) {
            Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        const apiKey = Platform.select({
            android: API_KEY_ANDROID,
            ios: API_KEY_IOS,
        });

        console.log(`configured apiKey: '${apiKey}' (length: ${apiKey?.length})`);

        if (!apiKey) {
            console.warn('⚠️ RevenueCat API Key not found! Premium features may not work.');
            return;
        }

        try {
            await Purchases.configure({ apiKey });

            // If we have a logged-in user, identify them
            if (userId) {
                await Purchases.logIn(userId);
            }

            this.isInitialized = true;
            console.log('✅ RevenueCat initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize RevenueCat:', error);
        }
    }

    /**
     * Identify user (e.g. after login)
     */
    async login(userId: string) {
        try {
            if (!this.isInitialized) return;
            await Purchases.logIn(userId);
            console.log('✅ RevenueCat user logged in:', userId);
        } catch (error) {
            console.error('❌ RevenueCat login failed:', error);
        }
    }

    /**
     * Reset user (e.g. after logout)
     */
    async logout() {
        try {
            if (!this.isInitialized) return;
            await Purchases.logOut();
            console.log('✅ RevenueCat user logged out');
        } catch (error) {
            console.error('❌ RevenueCat logout failed:', error);
        }
    }

    /**
     * Get available offerings (products)
     * This is used to display the Paywall
     */
    async getOfferings(): Promise<PurchasesOffering | null> {
        try {
            if (!this.isInitialized) {
                throw new Error('RevenueCat not initialized');
            }

            const offerings = await Purchases.getOfferings();
            if (offerings.current !== null) {
                return offerings.current;
            }

            // Explicitly throw if no offering is current
            throw new Error('No current offering found. Check RevenueCat Dashboard > Offerings > Select "Current".');
        } catch (error) {
            console.error('❌ Error fetching offerings:', error);
            throw error; // Rethrow so UI can show Alert
        }
    }

    /**
     * Purchase a package
     */
    async purchasePackage(pack: PurchasesPackage): Promise<{
        isPremium: boolean;
        customerInfo: CustomerInfo;
    }> {
        try {
            const { customerInfo } = await Purchases.purchasePackage(pack);
            const isPremium = this.checkPremiumEntitlement(customerInfo);
            return { isPremium, customerInfo };
        } catch (error: any) {
            if (!error.userCancelled) {
                console.error('❌ Purchase failed:', error);
                throw error; // Re-throw for UI handling (except user cancelled)
            }
            throw error;
        }
    }

    /**
     * Restore purchases (for re-installs)
     */
    async restorePurchases(): Promise<boolean> {
        try {
            const customerInfo = await Purchases.restorePurchases();
            return this.checkPremiumEntitlement(customerInfo);
        } catch (error) {
            console.error('❌ Restore failed:', error);
            throw error;
        }
    }

    /**
     * Get detailed premium status including expiry
     */
    async getFullCustomerInfo(): Promise<{
        isPremium: boolean;
        expirationDate: string | null;
        productIdentifier: string | null;
    }> {
        try {
            if (!this.isInitialized) return { isPremium: false, expirationDate: null, productIdentifier: null };
            const customerInfo = await Purchases.getCustomerInfo();

            // Get the first active entitlement (whatever it is named)
            const activeEntitlements = Object.values(customerInfo.entitlements.active);
            const entitlement = activeEntitlements.length > 0 ? activeEntitlements[0] : null;

            return {
                isPremium: entitlement !== null,
                expirationDate: entitlement?.expirationDate || null,
                productIdentifier: entitlement?.productIdentifier || null,
            };
        } catch (error) {
            console.error('❌ Error checking full customer status:', error);
            return { isPremium: false, expirationDate: null, productIdentifier: null };
        }
    }

    /**
     * Get the URL for the user to manage their subscription
     */
    async getManagementURL(): Promise<string | null> {
        if (Platform.OS === 'ios') {
            return 'https://apps.apple.com/account/subscriptions';
        }
        return 'https://play.google.com/store/account/subscriptions';
    }

    // Helper to check specific entitlement
    private checkPremiumEntitlement(customerInfo: CustomerInfo): boolean {
        // If there is ANY active entitlement, they are premium. 
        // This avoids bugs if the entitlement name in the dashboard differs.
        return Object.keys(customerInfo.entitlements.active).length > 0;
    }

    /**
     * Instantly sync RevenueCat verification with the backend
     */
    async syncSubscriptionWithBackend(): Promise<void> {
        try {
            if (!this.isInitialized) return;
            const status = await this.getFullCustomerInfo();

            // Fire and forget - Do not await/block UI thread
            apiClient.post('/subscription/sync', {
                isPremium: status.isPremium,
                plan: status.productIdentifier?.includes('yearly') ? 'yearly' : 'monthly', // default mapping based on typical IDs
                expiryDate: status.expirationDate,
                revenueCatId: (await Purchases.getCustomerInfo()).originalAppUserId,
            }).then(() => {
                console.log('✅ Subscription state synced strictly with Backend');
            }).catch((err) => {
                console.log('⚠️ Subscription sync backend ping failed:', err.message);
            });
        } catch (error) {
            console.error('❌ Error triggering subscription sync:', error);
        }
    }
}

export default RevenueCatService.getInstance();
