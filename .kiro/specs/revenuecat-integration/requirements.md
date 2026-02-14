# Requirements Document: RevenueCat Integration

## Introduction

This document specifies the requirements for integrating RevenueCat subscription management into the Pairly couples photo-sharing app. The integration will replace the existing mock premium system with a production-ready subscription platform supporting iOS and Android, including receipt validation, subscription lifecycle management, and webhook handling.

## Glossary

- **RevenueCat**: Third-party subscription management platform that handles in-app purchases across iOS and Android
- **App**: The Pairly React Native mobile application (frontend)
- **Backend**: The Node.js + Express + Prisma + PostgreSQL server
- **SDK**: RevenueCat's client-side software development kit for React Native
- **Receipt**: Digital proof of purchase from Apple App Store or Google Play Store
- **Webhook**: HTTP callback from RevenueCat to Backend when subscription events occur
- **Premium_Feature**: Any feature in the App that requires an active subscription
- **Subscription_Status**: Current state of a user's subscription (active, expired, cancelled, trial)
- **Entitlement**: RevenueCat's representation of access rights to premium features
- **Customer_Info**: RevenueCat's data structure containing subscription and entitlement information
- **Restore_Purchase**: Process of recovering subscription status from platform stores
- **Free_Trial**: 7-day period where users access premium features without payment
- **Database**: PostgreSQL database accessed via Prisma ORM

## Requirements

### Requirement 1: SDK Integration

**User Story:** As a developer, I want to integrate RevenueCat SDKs into the frontend and backend, so that the app can communicate with RevenueCat services.

#### Acceptance Criteria

1. WHEN the App initializes, THE SDK SHALL configure itself with the appropriate API key for the platform (iOS or Android)
2. WHEN the Backend starts, THE SDK SHALL initialize with the RevenueCat secret key
3. THE App SHALL use the RevenueCat React Native SDK version compatible with Expo v54
4. THE Backend SHALL use the RevenueCat Node.js SDK for server-side operations
5. WHEN SDK initialization fails, THE App SHALL log the error and continue with limited functionality

### Requirement 2: User Identity Management

**User Story:** As a user, I want my subscription to be linked to my account, so that I can access premium features across devices.

#### Acceptance Criteria

1. WHEN a user logs into the App, THE App SHALL identify the user to RevenueCat using their unique user ID
2. WHEN a user's identity is set, THE SDK SHALL associate all purchases with that user ID
3. THE Backend SHALL store the RevenueCat customer ID in the Database revenueCatId field
4. WHEN a user logs out, THE App SHALL clear the RevenueCat identity
5. WHEN a user switches accounts, THE App SHALL update the RevenueCat identity to the new user

### Requirement 3: Subscription Purchase Flow

**User Story:** As a user, I want to purchase a subscription, so that I can access premium features.

#### Acceptance Criteria

1. WHEN a user selects a subscription plan, THE App SHALL display the platform-native purchase dialog with correct pricing
2. WHEN a user completes a purchase, THE SDK SHALL send the receipt to RevenueCat for validation
3. WHEN RevenueCat validates the receipt, THE App SHALL receive updated Customer_Info with active entitlements
4. WHEN a purchase succeeds, THE App SHALL update the UI to reflect premium status immediately
5. WHEN a purchase fails, THE App SHALL display an appropriate error message to the user
6. WHEN a purchase is cancelled by the user, THE App SHALL return to the previous screen without error

### Requirement 4: Subscription Plans Configuration

**User Story:** As a product manager, I want to offer monthly and yearly subscription plans with a free trial, so that users have flexible payment options.

#### Acceptance Criteria

1. THE App SHALL offer a monthly subscription plan priced at $3.99 USD
2. THE App SHALL offer a yearly subscription plan priced at $39.99 USD
3. WHEN a user subscribes for the first time, THE App SHALL include a 7-day Free_Trial
4. THE App SHALL display the trial duration and pricing clearly before purchase
5. THE App SHALL fetch available subscription packages from RevenueCat on app launch

### Requirement 5: Receipt Validation

**User Story:** As a developer, I want all purchases validated server-side, so that the system prevents fraudulent premium access.

#### Acceptance Criteria

1. WHEN the App receives a purchase confirmation, THE Backend SHALL validate the receipt with RevenueCat
2. WHEN the Backend validates a receipt, THE Backend SHALL update the Database with subscription status
3. WHEN receipt validation fails, THE Backend SHALL deny premium access and log the failure
4. THE Backend SHALL use RevenueCat's server-side SDK for all validation operations
5. WHEN a receipt is valid, THE Backend SHALL update isPremium, premiumPlan, and premiumExpiry fields

### Requirement 6: Subscription Status Synchronization

**User Story:** As a user, I want my subscription status to be consistent across the app and server, so that I have reliable access to premium features.

#### Acceptance Criteria

1. WHEN the App launches, THE App SHALL fetch current Customer_Info from RevenueCat
2. WHEN Customer_Info is received, THE App SHALL sync the subscription status with the Backend
3. WHEN the Backend receives a status update, THE Backend SHALL update the Database immediately
4. WHEN subscription status changes, THE App SHALL update all Premium_Feature gates within 5 seconds
5. WHEN the App is offline, THE App SHALL use cached subscription status from the last successful sync

### Requirement 7: Subscription Lifecycle Management

**User Story:** As a user, I want the system to handle subscription renewals, cancellations, and expirations automatically, so that my access is managed correctly.

#### Acceptance Criteria

1. WHEN a subscription renews successfully, THE Backend SHALL update the premiumExpiry date in the Database
2. WHEN a user cancels their subscription, THE Backend SHALL maintain premium access until the current period ends
3. WHEN a subscription expires, THE Backend SHALL set isPremium to false and revoke premium access
4. WHEN a subscription enters a billing retry state, THE Backend SHALL maintain premium access during the grace period
5. WHEN a subscription is refunded, THE Backend SHALL immediately revoke premium access

### Requirement 8: Webhook Integration

**User Story:** As a developer, I want to receive real-time subscription events from RevenueCat, so that the system stays synchronized without polling.

#### Acceptance Criteria

1. WHEN RevenueCat sends a webhook event, THE Backend SHALL receive and authenticate the request
2. WHEN a webhook is authenticated, THE Backend SHALL process the event and update the Database
3. THE Backend SHALL handle these webhook event types: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE
4. WHEN webhook processing fails, THE Backend SHALL log the error and return a retry-able status code
5. WHEN a webhook is processed successfully, THE Backend SHALL return a 200 status code

### Requirement 9: Restore Purchases

**User Story:** As a user, I want to restore my purchases on a new device, so that I can access my premium features without repurchasing.

#### Acceptance Criteria

1. WHEN a user taps the restore purchases button, THE App SHALL call the SDK restore method
2. WHEN restore completes successfully, THE App SHALL receive updated Customer_Info with active entitlements
3. WHEN restore finds an active subscription, THE App SHALL sync the status with the Backend
4. WHEN restore finds no purchases, THE App SHALL display a message indicating no purchases were found
5. WHEN restore fails due to network error, THE App SHALL display an appropriate error message

### Requirement 10: Premium Feature Gates

**User Story:** As a user, I want premium features to be accessible only with an active subscription, so that the subscription model is enforced.

#### Acceptance Criteria

1. WHEN a user accesses a Premium_Feature, THE App SHALL check current entitlement status
2. WHEN a user has an active entitlement, THE App SHALL grant access to the Premium_Feature
3. WHEN a user lacks an active entitlement, THE App SHALL display a paywall or upgrade prompt
4. THE App SHALL check entitlements for these features: unlimited moments, shared love notes, time-lock messages, dual camera, live presence, secret vault, dark mode, themes, app lock, smart reminders
5. WHEN entitlement status is uncertain due to network issues, THE App SHALL use cached status from the last successful check

### Requirement 11: Offline Handling

**User Story:** As a user, I want to access premium features when offline, so that temporary connectivity issues don't disrupt my experience.

#### Acceptance Criteria

1. WHEN the App is offline, THE App SHALL use the last cached Customer_Info for entitlement checks
2. WHEN the App regains connectivity, THE App SHALL fetch fresh Customer_Info and update cached data
3. WHEN cached data is older than 24 hours, THE App SHALL display a warning that subscription status may be outdated
4. WHEN the App is offline during purchase attempt, THE App SHALL display a message requiring internet connection
5. WHEN the App is offline, THE App SHALL queue subscription status updates for sync when online

### Requirement 12: Migration from Mock System

**User Story:** As a developer, I want to migrate existing premium users from the mock system to RevenueCat, so that current subscribers maintain their access.

#### Acceptance Criteria

1. WHEN the Backend detects a user with isPremium true but no revenueCatId, THE Backend SHALL flag the user for migration
2. WHEN a flagged user opens the App, THE App SHALL prompt them to restore purchases or re-subscribe
3. THE Backend SHALL preserve existing premiumExpiry dates during migration
4. WHEN migration is complete, THE Backend SHALL populate the revenueCatId field
5. THE Backend SHALL maintain backward compatibility with the existing Database schema

### Requirement 13: Error Handling and Logging

**User Story:** As a developer, I want comprehensive error handling and logging, so that I can diagnose and fix subscription issues quickly.

#### Acceptance Criteria

1. WHEN any RevenueCat operation fails, THE App SHALL log the error with context (user ID, operation type, error code)
2. WHEN the Backend encounters a validation error, THE Backend SHALL log the receipt data and error details
3. WHEN a webhook fails to process, THE Backend SHALL log the full webhook payload and error
4. THE App SHALL display user-friendly error messages that don't expose technical details
5. WHEN critical errors occur, THE Backend SHALL send alerts to the monitoring system

### Requirement 14: Testing and Sandbox Support

**User Story:** As a developer, I want to test subscriptions in sandbox environments, so that I can verify functionality before production release.

#### Acceptance Criteria

1. THE App SHALL support configuration for RevenueCat sandbox mode during development
2. WHEN in sandbox mode, THE App SHALL use test API keys and display a sandbox indicator
3. THE Backend SHALL support separate webhook endpoints for sandbox and production
4. WHEN testing, THE App SHALL allow rapid subscription state changes for testing lifecycle events
5. THE App SHALL provide a debug screen showing current subscription status and entitlements
