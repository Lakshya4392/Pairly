import Purchases, {
    CustomerInfo,
    PurchasesOffering,
    PurchasesPackage,
    LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';

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
                console.warn('⚠️ RevenueCat not initialized');
                return null;
            }

            const offerings = await Purchases.getOfferings();
            if (offerings.current !== null) {
                return offerings.current;
            }
            console.warn('⚠️ No current offering found in RevenueCat');
            return null;
        } catch (error) {
            console.error('❌ Error fetching offerings:', error);
            return null;
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
     * Check if user has active premium entitlement
     */
    async getCustomerStatus(): Promise<boolean> {
        try {
            if (!this.isInitialized) return false;
            const customerInfo = await Purchases.getCustomerInfo();
            return this.checkPremiumEntitlement(customerInfo);
        } catch (error) {
            console.error('❌ Error checking customer status:', error);
            return false;
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
        // ⚠️ IMPORTANT: 'premium_access' must match your RevenueCat Entitlement ID
        // Updated to match user's dashboard: 'Pairly Pro'
        return (
            typeof customerInfo.entitlements.active['Pairly Pro'] !== 'undefined'
        );
    }
}

export default RevenueCatService.getInstance();
