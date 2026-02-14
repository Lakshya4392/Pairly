# Implementation Plan: RevenueCat Integration

## Overview

This implementation plan breaks down the RevenueCat integration into incremental steps, starting with SDK setup, then implementing core subscription flows, followed by backend validation and webhook handling, and finally migration and testing. Each task builds on previous work to ensure continuous integration and early validation.

## Tasks

- [ ] 1. Set up RevenueCat SDKs and configuration
  - [ ] 1.1 Install RevenueCat React Native SDK compatible with Expo v54
    - Add `react-native-purchases` package to package.json
    - Configure Expo plugins if needed for RevenueCat
    - _Requirements: 1.3_
  
  - [ ] 1.2 Install RevenueCat Node.js SDK in backend
    - Add `@revenuecat/purchases-node` package to backend package.json
    - _Requirements: 1.4_
  
  - [ ] 1.3 Create environment configuration for API keys
    - Add iOS and Android API keys to frontend .env
    - Add RevenueCat secret key to backend .env
    - Add sandbox mode flag for development
    - _Requirements: 1.1, 1.2, 14.1_
  
  - [ ] 1.4 Implement RevenueCat configuration module (frontend)
    - Create `src/services/revenuecat/RevenueCatConfig.ts`
    - Implement `initialize()`, `setUserId()`, `clearUserId()`, `getCustomerInfo()` methods
    - Add platform detection for iOS/Android API key selection
    - Add error handling for initialization failures
    - _Requirements: 1.1, 1.5, 2.1, 2.4_
  
  - [ ] 1.5 Write property test for platform-specific initialization
    - **Property 1: Platform-specific SDK initialization**
    - **Validates: Requirements 1.1**
  
  - [ ] 1.6 Write property test for initialization error resilience
    - **Property 16: Initialization error resilience**
    - **Validates: Requirements 1.5**

- [ ] 2. Implement user identity management
  - [ ] 2.1 Add identity management to authentication flow
    - Call `setUserId()` after successful login
    - Call `clearUserId()` on logout
    - Handle account switching scenarios
    - _Requirements: 2.1, 2.4, 2.5_
  
  - [ ] 2.2 Write property test for user identity association
    - **Property 2: User identity association**
    - **Validates: Requirements 2.1, 2.2, 2.5**
  
  - [ ] 2.3 Write property test for identity cleanup on logout
    - **Property 3: Identity cleanup on logout**
    - **Validates: Requirements 2.4**

- [ ] 3. Implement subscription offerings and purchase flow (frontend)
  - [ ] 3.1 Create SubscriptionManager service
    - Create `src/services/revenuecat/SubscriptionManager.ts`
    - Implement `fetchOfferings()` to get available packages
    - Implement `purchasePackage()` for purchase flow
    - Implement `getSubscriptionStatus()` to transform CustomerInfo
    - Add error handling for purchase failures and cancellations
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.5_
  
  - [ ] 3.2 Implement backend sync in SubscriptionManager
    - Implement `syncWithBackend()` method
    - Call sync after successful purchase
    - Handle sync failures gracefully
    - _Requirements: 6.2_
  
  - [ ] 3.3 Write property test for purchase receipt transmission
    - **Property 4: Purchase receipt transmission**
    - **Validates: Requirements 3.2, 3.3**
  
  - [ ] 3.4 Write property test for purchase success UI update
    - **Property 5: Purchase success UI update**
    - **Validates: Requirements 3.4**
  
  - [ ] 3.5 Write property test for purchase error handling
    - **Property 6: Purchase error handling**
    - **Validates: Requirements 3.5**
  
  - [ ] 3.6 Write property test for first-time subscription trial inclusion
    - **Property 7: First-time subscription trial inclusion**
    - **Validates: Requirements 4.3**

- [ ] 4. Create subscription UI components
  - [ ] 4.1 Create PaywallScreen component
    - Create `src/screens/PaywallScreen.tsx`
    - Display monthly ($3.99) and yearly ($39.99) plans
    - Show 7-day trial information prominently
    - Add purchase buttons that call SubscriptionManager
    - Add restore purchases button
    - Handle loading and error states
    - _Requirements: 3.1, 4.1, 4.2, 4.3, 4.4_
  
  - [ ] 4.2 Create SubscriptionCard component
    - Create `src/components/SubscriptionCard.tsx`
    - Display plan name, price, and trial info
    - Highlight recommended plan (yearly)
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ] 4.3 Add subscription status badge to profile
    - Create `src/components/SubscriptionStatusBadge.tsx`
    - Display "Premium" badge for active subscribers
    - Display "Free" or plan expiry for others
    - _Requirements: 6.4_

- [ ] 5. Implement entitlement checking and feature gates
  - [ ] 5.1 Create EntitlementManager service
    - Create `src/services/revenuecat/EntitlementManager.ts`
    - Implement `hasAccess()` for premium feature checks
    - Implement `checkEntitlement()` for specific entitlement IDs
    - Implement `getCachedStatus()` for synchronous access
    - Implement `refreshEntitlements()` for manual refresh
    - Add caching with 24-hour expiry
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 11.1_
  
  - [ ] 5.2 Update existing premium feature gates
    - Replace mock PremiumService calls with EntitlementManager
    - Update feature gates for: unlimited moments, love notes, time-lock messages, dual camera, live presence, secret vault, dark mode, themes, app lock, smart reminders
    - Show paywall when access is denied
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [ ] 5.3 Write property test for feature gate entitlement check
    - **Property 9: Feature gate entitlement check**
    - **Validates: Requirements 10.1, 10.4**
  
  - [ ] 5.4 Write property test for entitlement-based access control
    - **Property 10: Entitlement-based access control**
    - **Validates: Requirements 10.2, 10.3**

- [ ] 6. Implement offline support and caching
  - [ ] 6.1 Add subscription data caching
    - Use AsyncStorage to cache CustomerInfo
    - Store timestamp with cached data
    - Implement cache expiry logic (24 hours)
    - _Requirements: 11.1, 11.3_
  
  - [ ] 6.2 Implement offline entitlement checks
    - Use cached CustomerInfo when offline
    - Display warning for stale cache (>24 hours)
    - Queue updates for sync when online
    - _Requirements: 6.5, 10.5, 11.1, 11.3, 11.5_
  
  - [ ] 6.3 Implement online reconnection logic
    - Detect network state changes
    - Fetch fresh CustomerInfo when coming online
    - Process queued updates
    - _Requirements: 11.2, 11.5_
  
  - [ ] 6.4 Write property test for offline cached data usage
    - **Property 11: Offline cached data usage**
    - **Validates: Requirements 6.5, 10.5, 11.1**
  
  - [ ] 6.5 Write property test for online reconnection refresh
    - **Property 12: Online reconnection refresh**
    - **Validates: Requirements 11.2**
  
  - [ ] 6.6 Write property test for stale cache warning
    - **Property 13: Stale cache warning**
    - **Validates: Requirements 11.3**
  
  - [ ] 6.7 Write property test for offline update queuing
    - **Property 14: Offline update queuing**
    - **Validates: Requirements 11.5**

- [ ] 7. Checkpoint - Ensure frontend tests pass
  - Ensure all frontend tests pass, ask the user if questions arise.

- [ ] 8. Implement backend RevenueCat client
  - [ ] 8.1 Create RevenueCat API client wrapper
    - Create `src/services/revenuecat/RevenueCatClient.ts` in backend
    - Initialize SDK with secret key from environment
    - Implement `getSubscriberInfo()` method
    - Add error handling and retry logic
    - _Requirements: 1.2, 5.4_
  
  - [ ] 8.2 Create SubscriptionService for backend
    - Create `src/services/SubscriptionService.ts` in backend
    - Implement `validateSubscription()` to check with RevenueCat
    - Implement `syncUserSubscription()` to update database
    - Implement `getSubscriptionStatus()` to query database
    - Implement `grantAccess()` and `revokeAccess()` helpers
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 6.3_
  
  - [ ] 8.3 Write property test for receipt validation and database update
    - **Property 17: Receipt validation and database update**
    - **Validates: Requirements 5.1, 5.2, 5.5**
  
  - [ ] 8.4 Write property test for invalid receipt handling
    - **Property 18: Invalid receipt handling**
    - **Validates: Requirements 5.3**
  
  - [ ] 8.5 Write property test for RevenueCat customer ID persistence
    - **Property 19: RevenueCat customer ID persistence**
    - **Validates: Requirements 2.3**

- [ ] 9. Implement backend API endpoints
  - [ ] 9.1 Create POST /api/subscription/sync endpoint
    - Accept userId and customerInfo from frontend
    - Validate with RevenueCat
    - Update database (isPremium, premiumPlan, premiumExpiry, revenueCatId)
    - Return updated subscription status
    - _Requirements: 5.1, 5.2, 5.5, 6.2, 6.3_
  
  - [ ] 9.2 Create GET /api/subscription/status endpoint
    - Query database for user's subscription status
    - Return isPremium, plan, expiryDate, revenueCatId
    - _Requirements: 6.3_
  
  - [ ] 9.3 Create POST /api/subscription/restore endpoint
    - Accept userId and customerInfo from restore flow
    - Validate with RevenueCat
    - Update database if subscription found
    - Return restore result and subscription status
    - _Requirements: 9.2, 9.3_
  
  - [ ] 9.4 Write property test for immediate database sync
    - **Property 20: Immediate database sync**
    - **Validates: Requirements 6.3**
  
  - [ ] 9.5 Write property test for feature gate update propagation
    - **Property 21: Feature gate update propagation**
    - **Validates: Requirements 6.4**

- [ ] 10. Implement webhook handler
  - [ ] 10.1 Create webhook signature verification
    - Create `src/middleware/verifyRevenueCatWebhook.ts`
    - Verify RevenueCat signature from request headers
    - Return 401 for invalid signatures
    - _Requirements: 8.1_
  
  - [ ] 10.2 Create POST /api/webhooks/revenuecat endpoint
    - Apply signature verification middleware
    - Parse webhook event payload
    - Route to appropriate event handler
    - Return 200 on success, 500 on failure
    - Log all webhook events
    - _Requirements: 8.1, 8.2, 8.4, 8.5_
  
  - [ ] 10.3 Implement webhook event handlers
    - Create handlers for: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE, UNCANCELLATION
    - INITIAL_PURCHASE: Set isPremium=true, store plan and expiry
    - RENEWAL: Update premiumExpiry
    - CANCELLATION: Keep isPremium=true (no immediate change)
    - EXPIRATION: Set isPremium=false
    - BILLING_ISSUE: Log issue, maintain access
    - UNCANCELLATION: Update expiry
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.2, 8.3_
  
  - [ ] 10.4 Write property test for webhook authentication
    - **Property 27: Webhook authentication**
    - **Validates: Requirements 8.1**
  
  - [ ] 10.5 Write property test for webhook event processing
    - **Property 28: Webhook event processing**
    - **Validates: Requirements 8.2, 8.3, 8.5**
  
  - [ ] 10.6 Write property test for webhook error handling
    - **Property 29: Webhook error handling**
    - **Validates: Requirements 8.4**
  
  - [ ] 10.7 Write property tests for subscription lifecycle
    - **Property 22: Renewal expiry update**
    - **Property 23: Cancellation grace period**
    - **Property 24: Expiration access revocation**
    - **Property 25: Billing retry grace period**
    - **Property 26: Refund immediate revocation**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [ ] 11. Implement restore purchases functionality
  - [ ] 11.1 Add restorePurchases method to SubscriptionManager
    - Call RevenueCat SDK restore method
    - Handle success: sync with backend
    - Handle no purchases found: show message
    - Handle network errors: show error message
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ] 11.2 Add restore purchases button to PaywallScreen
    - Add button with loading state
    - Show success/error messages
    - Navigate to appropriate screen after restore
    - _Requirements: 9.1_
  
  - [ ] 11.3 Write property test for restore purchases sync
    - **Property 15: Restore purchases sync**
    - **Validates: Requirements 9.2, 9.3**
  
  - [ ] 11.4 Write unit test for restore with no purchases found
    - Test the specific case where restore finds nothing
    - Verify appropriate message is displayed
    - _Requirements: 9.4_
  
  - [ ] 11.5 Write unit test for offline purchase attempt
    - Test that offline purchase shows error message
    - _Requirements: 11.4_

- [ ] 12. Checkpoint - Ensure backend tests pass
  - Ensure all backend tests pass, ask the user if questions arise.

- [ ] 13. Implement migration from mock system
  - [ ] 13.1 Create MigrationService
    - Create `src/services/MigrationService.ts` in backend
    - Implement `identifyLegacyUsers()` to find users with isPremium=true and revenueCatId=null
    - Implement `flagUserForMigration()` to mark users
    - Implement `completeMigration()` to populate revenueCatId
    - Implement `getMigrationStatus()` to check migration state
    - _Requirements: 12.1, 12.2, 12.4_
  
  - [ ] 13.2 Add migration check to app launch
    - Check migration status on app launch
    - Show migration prompt if user needs migration
    - Prompt user to restore purchases or re-subscribe
    - _Requirements: 12.2_
  
  - [ ] 13.3 Add migration completion to sync flow
    - When syncing subscription, check if user needs migration
    - Complete migration by populating revenueCatId
    - Preserve existing premiumExpiry date
    - _Requirements: 12.3, 12.4_
  
  - [ ] 13.4 Write property test for migration user detection
    - **Property 30: Migration user detection**
    - **Validates: Requirements 12.1**
  
  - [ ] 13.5 Write property test for migration prompt display
    - **Property 31: Migration prompt display**
    - **Validates: Requirements 12.2**
  
  - [ ] 13.6 Write property test for migration expiry preservation
    - **Property 32: Migration expiry preservation**
    - **Validates: Requirements 12.3**
  
  - [ ] 13.7 Write property test for migration completion
    - **Property 33: Migration completion**
    - **Validates: Requirements 12.4**

- [ ] 14. Implement error handling and logging
  - [ ] 14.1 Add comprehensive error logging to frontend
    - Log all RevenueCat operations with context (userId, operation, error code)
    - Use structured logging format
    - _Requirements: 13.1_
  
  - [ ] 14.2 Add comprehensive error logging to backend
    - Log validation errors with receipt data
    - Log webhook failures with full payload
    - Log all database operations
    - _Requirements: 13.2, 13.3_
  
  - [ ] 14.3 Implement user-friendly error messages
    - Create error message mapping for common errors
    - Ensure no technical details exposed to users
    - _Requirements: 13.4_
  
  - [ ] 14.4 Add critical error alerting
    - Integrate with monitoring system (e.g., Sentry)
    - Send alerts for repeated validation failures
    - Send alerts for webhook processing failures
    - _Requirements: 13.5_
  
  - [ ] 14.5 Write property test for error logging with context
    - **Property 34: Error logging with context**
    - **Validates: Requirements 13.1, 13.2, 13.3**
  
  - [ ] 14.6 Write property test for user-friendly error messages
    - **Property 35: User-friendly error messages**
    - **Validates: Requirements 13.4**
  
  - [ ] 14.7 Write property test for critical error alerting
    - **Property 36: Critical error alerting**
    - **Validates: Requirements 13.5**

- [ ] 15. Implement sandbox and debug features
  - [ ] 15.1 Add sandbox mode support
    - Add sandbox flag to environment config
    - Use test API keys when in sandbox mode
    - Display sandbox indicator in app
    - _Requirements: 14.1, 14.2_
  
  - [ ] 15.2 Create debug screen for subscription status
    - Create `src/screens/DebugSubscriptionScreen.tsx`
    - Display current CustomerInfo
    - Display entitlements
    - Display cached data and expiry
    - Add buttons to manually refresh and clear cache
    - Only accessible in development builds
    - _Requirements: 14.5_
  
  - [ ] 15.3 Add separate webhook endpoints for sandbox
    - Create `/api/webhooks/revenuecat/sandbox` endpoint
    - Route sandbox webhooks separately from production
    - _Requirements: 14.3_
  
  - [ ] 15.4 Write unit test for sandbox mode configuration
    - Verify sandbox mode uses test keys
    - Verify sandbox indicator is displayed
    - _Requirements: 14.1, 14.2_
  
  - [ ] 15.5 Write unit test for separate webhook endpoints
    - Verify sandbox and production endpoints exist
    - _Requirements: 14.3_
  
  - [ ] 15.6 Write unit test for debug screen display
    - Verify debug screen shows subscription info
    - _Requirements: 14.5_

- [ ] 16. Integration testing and end-to-end flows
  - [ ] 16.1 Write property test for end-to-end purchase flow
    - **Property 38: End-to-end purchase flow**
    - **Validates: Requirements 3.1, 3.2, 3.3, 5.1, 5.2, 6.2, 6.3**
  
  - [ ] 16.2 Write property test for webhook-driven synchronization
    - **Property 39: Webhook-driven synchronization**
    - **Validates: Requirements 7.1, 7.2, 7.3, 8.1, 8.2, 6.1**
  
  - [ ] 16.3 Write property test for cross-device restore consistency
    - **Property 40: Cross-device restore consistency**
    - **Validates: Requirements 9.1, 9.2, 9.3, 6.2, 6.3**
  
  - [ ] 16.4 Write integration test for purchase to database flow
    - Test complete flow: app purchase → backend validation → database update
    - Verify all layers reflect premium status
    - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.2, 6.2, 6.3_
  
  - [ ] 16.5 Write integration test for webhook to app flow
    - Test: webhook event → database update → app refresh → UI update
    - _Requirements: 7.1, 8.1, 8.2, 6.1_

- [ ] 17. Update documentation and configuration
  - [ ] 17.1 Update environment variable documentation
    - Document all required RevenueCat API keys
    - Document sandbox vs production configuration
    - Add setup instructions for RevenueCat dashboard
  
  - [ ] 17.2 Create RevenueCat configuration guide
    - Document product IDs for iOS and Android
    - Document entitlement IDs
    - Document webhook URL configuration
    - Document testing procedures
  
  - [ ] 17.3 Update API documentation
    - Document new subscription endpoints
    - Document webhook endpoint
    - Document request/response formats

- [ ] 18. Final checkpoint - Comprehensive testing
  - Ensure all tests pass (unit, property, integration)
  - Test complete purchase flow in sandbox
  - Test restore purchases flow
  - Test webhook delivery and processing
  - Test offline scenarios
  - Test migration flow for legacy users
  - Ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows across all system layers
- Checkpoints ensure incremental validation at key milestones
- The implementation maintains backward compatibility with existing database schema
- All sensitive API keys must be stored in environment variables, never committed to code
