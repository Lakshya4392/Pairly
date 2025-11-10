# Implementation Plan

- [x] 1. Initialize project structure and dependencies



  - Create React Native project with TypeScript template
  - Set up folder structure: `/src/screens`, `/src/components`, `/src/services`, `/src/types`, `/src/theme`
  - Install core dependencies: React Navigation, React Native Paper, Reanimated 3, Socket.IO client, Clerk, react-native-image-picker, react-native-image-resizer, react-native-background-actions, @react-native-community/netinfo
  - Configure TypeScript with strict mode
  - Set up ESLint and Prettier with React Native config
  - _Requirements: 10.1, 10.2_




- [ ] 2. Create theme system and design tokens
  - Implement color palette constants (#FF6DAE, #C6B6FF, #FFF8FB) in `/src/theme/colors.ts`
  - Create typography configuration with Poppins Rounded and Sacramento fonts in `/src/theme/typography.ts`
  - Set up spacing, shadow, and gradient utilities in `/src/theme/spacing.ts` and `/src/theme/shadows.ts`



  - Configure React Native Paper theme with custom colors
  - Create reusable animation presets (heartPulse, fadeIn, slideUp) using Reanimated
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 3. Set up backend project and database
  - Initialize Node.js + Express + TypeScript project in `/backend` directory





  - Install dependencies: Prisma, Socket.IO, Express, Clerk SDK, Sharp, Multer, CORS
  - Configure Neon PostgreSQL connection string in `.env`
  - Create Prisma schema with User, Pair, and Moment models
  - Run Prisma migrations to create database tables
  - Set up Express middleware: CORS, JSON parser, authentication


  - _Requirements: 1.3, 2.3, 3.4_

- [ ] 4. Implement authentication with Clerk
- [ ] 4.1 Create AuthScreen component
  - Build UI with gradient background and Google sign-in button


  - Implement Clerk Google OAuth flow
  - Add heart pulse animation on screen load
  - Handle authentication success and navigate to pairing screen





  - _Requirements: 1.1, 1.2, 1.3, 8.3_

- [ ] 4.2 Create authentication service
  - Implement `AuthService` with Clerk integration
  - Store JWT token securely (iOS Keychain, Android Keystore)


  - Create authentication middleware for API requests
  - Handle token refresh logic
  - _Requirements: 1.3, 1.5_

- [ ] 4.3 Build backend authentication endpoints
  - Create `POST /auth/google` endpoint to verify Clerk token


  - Implement user creation/retrieval logic
  - Generate and return JWT token
  - Add authentication middleware for protected routes


  - _Requirements: 1.3, 1.4_

- [ ] 5. Implement pairing functionality
- [ ] 5.1 Create PairingScreen component
  - Build UI with options to generate or enter invite code
  - Implement 6-character code input with validation
  - Add copy-to-clipboard functionality for generated codes
  - Display pairing status with soft animations
  - _Requirements: 2.1, 2.2, 8.4_

- [ ] 5.2 Build pairing API endpoints
  - Create `POST /pairs/generate-code` to create unique 6-char alphanumeric code
  - Implement code expiration logic (24 hours)
  - Create `POST /pairs/join` to establish pairing relationship
  - Add validation for invalid/expired codes
  - Emit Socket.IO event when pairing succeeds
  - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [ ] 5.3 Implement pairing service in frontend
  - Create `PairingService` with methods: `generateCode()`, `joinWithCode()`
  - Handle pairing success and navigate to upload screen
  - Display appropriate error messages for invalid codes
  - Store pair information in local state
  - _Requirements: 2.3, 2.4_

- [x] 6. Build photo capture and upload functionality


- [x] 6.1 Create UploadScreen component

  - Design main screen with large circular capture button
  - Add partner name display at top with Sacramento font
  - Implement settings icon navigation
  - Apply gradient background and soft shadows
  - Add heart pulse animation on button press
  - _Requirements: 3.1, 8.1, 8.4_

- [x] 6.2 Implement PhotoService


  - Create methods: `capturePhoto()`, `selectFromGallery()` using react-native-image-picker
  - Implement `compressPhoto()` to reduce image to <500KB with 85% JPEG quality
  - Add validation for image format and size
  - Handle camera/gallery permissions
  - _Requirements: 3.2, 3.3_



- [ ] 6.3 Build photo upload logic
  - Create `uploadPhoto()` method in PhotoService
  - Implement FormData upload to backend API
  - Add progress indicator during upload
  - Show success animation (fade + heart) on completion


  - Implement retry logic (up to 3 attempts) on failure
  - _Requirements: 3.4, 3.5, 3.6_

- [ ] 6.4 Create backend photo upload endpoint
  - Build `POST /moments/upload` with Multer for file handling


  - Compress image using Sharp on server side
  - Store photo as BYTEA in PostgreSQL via Prisma
  - Delete previous moment for the pair (ephemeral nature)
  - Emit Socket.IO 'new_moment' event to partner
  - Trigger push notification to partner's device
  - _Requirements: 3.4, 6.1, 6.4_

- [x] 7. Implement real-time synchronization

- [x] 7.1 Set up Socket.IO server

  - Configure Socket.IO with Express server
  - Implement authentication for socket connections
  - Create room-based architecture (one room per user)
  - Handle 'join_room', 'new_moment', 'partner_disconnected' events
  - _Requirements: 4.1_



- [ ] 7.2 Create RealtimeService in frontend
  - Implement Socket.IO client connection with auto-reconnect
  - Create `connect()`, `disconnect()`, `onNewMoment()` methods
  - Handle connection state changes
  - Emit 'join_room' on connection
  - Listen for 'new_moment' events and trigger widget update


  - _Requirements: 4.1, 4.3_

- [ ] 7.3 Implement moment delivery flow
  - Create `GET /moments/latest` endpoint to fetch current photo





  - Return base64-encoded photo with partner name
  - Handle offline queue: store failed uploads locally
  - Retry queued uploads when connection restored
  - _Requirements: 4.2, 4.5, 11.1, 11.2_


- [ ] 8. Build background service for persistent connection
- [ ] 8.1 Set up Android background service
  - Install `react-native-background-actions` or create custom Headless JS service
  - Configure AndroidManifest.xml with FOREGROUND_SERVICE permission
  - Create background task that maintains Socket.IO connection
  - Implement battery optimization handling

  - _Requirements: 12.1, 12.2, 12.5_

- [ ] 8.2 Set up iOS background capabilities
  - Enable Background Modes in Xcode (Background fetch, Remote notifications)
  - Configure background fetch intervals
  - Implement background task to maintain Socket.IO connection
  - Handle iOS background restrictions efficiently
  - _Requirements: 12.1, 12.2, 12.5_

- [ ] 8.3 Create BackgroundService
  - Implement `startService()` and `stopService()` methods
  - Create `maintainSocketConnection()` to keep Socket.IO alive 24/7
  - Handle reconnection logic when connection drops
  - Listen for 'new_moment' events in background
  - Trigger widget update immediately on event receipt
  - Optimize for battery efficiency (heartbeat intervals, wake locks)
  - _Requirements: 12.2, 12.3, 12.4_

- [ ] 9. Implement iOS home screen widget
- [ ] 9.1 Create WidgetKit extension in Xcode
  - Set up widget target in iOS project
  - Configure App Group for data sharing between app and widget
  - Create widget entry structure with photo data and partner name
  - _Requirements: 5.1, 10.3_

- [ ] 9.2 Build widget UI in SwiftUI
  - Design widget layout with soft rounded corners (20pt)
  - Apply gradient background (#FFF8FB to #C6B6FF)
  - Display photo with aspect ratio 3:4 and subtle shadow
  - Add partner name in Sacramento font below photo
  - Create placeholder state for no photo
  - _Requirements: 5.2, 5.4, 8.1_

- [ ] 9.3 Implement widget update mechanism
  - Create timeline provider to manage widget updates
  - Write photo data to App Group shared container
  - Trigger widget reload from React Native using native module
  - Implement background fetch to update widget when app is closed
  - Add fade transition animation (800ms) on photo update
  - _Requirements: 5.3, 8.3_

- [ ] 10. Implement Android home screen widget
- [ ] 10.1 Create Jetpack Glance widget
  - Set up widget provider in Android project
  - Create Glance composable for widget UI
  - Configure widget metadata (size, update frequency)
  - _Requirements: 5.1, 10.4_

- [ ] 10.2 Build widget UI with Compose
  - Design widget layout with rounded corners (20dp)
  - Apply gradient background using custom drawable
  - Display photo with elevation and shadow
  - Add partner name with custom font
  - Create placeholder state for no photo
  - _Requirements: 5.2, 5.4, 8.1_

- [ ] 10.3 Implement widget update mechanism
  - Create WorkManager job for periodic updates
  - Set up BroadcastReceiver to handle FCM notifications
  - Write photo data to SharedPreferences
  - Trigger widget update from React Native using native module
  - Update widget via `GlanceAppWidgetManager.update()`
  - _Requirements: 5.3, 4.3_

- [ ] 11. Create WidgetService bridge
  - Build native module for iOS to communicate with WidgetKit
  - Build native module for Android to communicate with Glance widget
  - Create unified `WidgetService` interface in React Native
  - Implement `updateWidget()`, `getWidgetData()`, `clearWidget()` methods
  - Handle platform-specific implementations
  - _Requirements: 5.3, 5.5_

- [ ] 12. Implement settings and profile management
- [ ] 12.1 Create SettingsScreen component
  - Build UI with display name editor
  - Add disconnect button with confirmation dialog
  - Include notification preferences toggle
  - Apply soft lavender accent colors
  - _Requirements: 7.1, 7.3_

- [ ] 12.2 Build profile update functionality
  - Create `PATCH /users/profile` endpoint
  - Update user display name in database
  - Emit Socket.IO 'partner_updated' event to partner
  - Update local state and AsyncStorage
  - _Requirements: 7.2_

- [ ] 12.3 Implement disconnect functionality
  - Create `DELETE /pairs/disconnect` endpoint
  - Remove pairing relationship from database
  - Delete all moments for the pair (cascade)
  - Emit 'partner_disconnected' event to partner
  - Clear widget data on both devices
  - Navigate both users to pairing screen
  - _Requirements: 7.3, 7.4, 7.5_

- [ ] 13. Implement offline resilience
  - Create local queue for failed uploads using AsyncStorage
  - Implement network state listener using `@react-native-community/netinfo`
  - Auto-retry queued uploads when connection restored
  - Display offline indicator in UI when disconnected
  - Cache current widget photo locally for offline display
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 14. Add error handling and user feedback
  - Create error handling utilities with gentle error messages
  - Implement toast notifications for success/error states
  - Add loading states for all async operations
  - Create error boundary component for crash recovery
  - Implement retry mechanisms with exponential backoff
  - Add haptic feedback for button presses
  - _Requirements: 3.6, 4.4, 8.4_

- [ ] 15. Implement navigation and app flow
  - Set up React Navigation with stack navigator
  - Create navigation flow: Auth → Pairing → Upload → Settings
  - Implement deep linking for notifications
  - Add navigation guards based on authentication and pairing status
  - Handle back button behavior on Android
  - _Requirements: 1.5, 2.3, 12.3_

- [ ] 16. Optimize performance
  - Implement image caching strategy
  - Optimize React Native bundle size
  - Add lazy loading for screens
  - Optimize Socket.IO reconnection logic
  - Implement memory leak prevention
  - Add performance monitoring with Firebase Performance
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 17. Polish UI animations and transitions
  - Implement all screen transition animations (fade, slide)
  - Add heart pulse animation to capture button
  - Create success animation for photo upload
  - Add subtle parallax effect to backgrounds
  - Implement loading skeleton screens
  - Add micro-interactions for all buttons
  - _Requirements: 8.3, 8.4_

- [ ] 18. Set up environment configuration
  - Create `.env` files for development, staging, production
  - Configure API base URLs for different environments
  - Set up Clerk keys for each environment
  - Configure Firebase projects for dev and prod
  - Add environment-specific app icons and splash screens
  - _Requirements: 1.1, 12.1_

- [ ] 19. Implement app permissions handling
  - Request camera permissions with custom messaging
  - Request photo library permissions
  - Request battery optimization exemption (Android) for background service
  - Handle permission denial gracefully
  - Add settings deep link for permission management
  - _Requirements: 3.2, 12.1, 12.5_

- [ ] 20. Create onboarding experience
  - Design welcome screen with app introduction
  - Add widget setup instructions after pairing
  - Create interactive tutorial for first photo upload
  - Implement skip option for returning users
  - Store onboarding completion status
  - _Requirements: 5.1_

- [ ] 21. Add analytics and monitoring
  - Integrate Firebase Analytics for user behavior tracking
  - Track key events: sign_up, pair_created, photo_uploaded, widget_added
  - Set up Sentry for error tracking and crash reporting
  - Implement custom logging for debugging
  - Add performance metrics collection
  - _Requirements: 9.1, 9.5_

- [ ] 22. Implement data privacy features
  - Add photo auto-deletion on disconnect
  - Implement secure token storage
  - Add data export functionality (GDPR compliance)
  - Create privacy policy and terms of service screens
  - Implement account deletion feature
  - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [ ] 23. Build backend API documentation
  - Document all API endpoints with request/response examples
  - Create Postman collection for API testing
  - Add API versioning strategy
  - Document Socket.IO events and payloads
  - Create developer setup guide
  - _Requirements: All API-related requirements_

- [ ] 24. Set up CI/CD pipeline
  - Configure GitHub Actions for automated testing
  - Set up automated builds for iOS (Fastlane)
  - Set up automated builds for Android (Gradle)
  - Configure TestFlight deployment for iOS
  - Configure Google Play Internal Testing for Android
  - Add automated version bumping
  - _Requirements: 10.1, 10.2_

- [ ] 25. Prepare for app store submission
  - Create app store screenshots for iOS (all required sizes)
  - Create Play Store screenshots for Android
  - Write app description and keywords
  - Design app icon with soft romantic aesthetic
  - Create promotional graphics
  - Prepare privacy policy and support URLs
  - _Requirements: 8.1_

- [ ]* 26. Write comprehensive tests
  - [ ]* 26.1 Write unit tests for services
    - Test PhotoService compression logic
    - Test RealtimeService connection handling
    - Test AuthService token management
    - Test PairingService code validation
    - _Requirements: 3.3, 4.3, 1.5, 2.4_

  - [ ]* 26.2 Write backend API tests
    - Test authentication endpoints
    - Test pairing endpoints with various scenarios
    - Test photo upload endpoint
    - Test moment retrieval endpoint
    - Test disconnect functionality
    - _Requirements: 1.3, 2.3, 3.4, 7.4_

  - [ ]* 26.3 Write integration tests
    - Test complete onboarding flow
    - Test photo upload and widget update flow
    - Test pairing with invite code
    - Test disconnect and re-pair flow
    - Test offline upload queue
    - _Requirements: 1.1-1.5, 3.1-3.6, 11.1-11.5_

  - [ ]* 26.4 Write widget tests
    - Test iOS widget timeline provider
    - Test Android widget update mechanism
    - Test widget UI rendering with different states
    - Test widget data persistence
    - _Requirements: 5.1-5.5_

  - [ ]* 26.5 Perform manual testing
    - Test on various iOS devices (iPhone 12, 13, 14, 15)
    - Test on various Android devices (Samsung, Pixel, OnePlus)
    - Test with poor network conditions
    - Test edge cases (storage full, rapid uploads, etc.)
    - Validate visual design matches specifications
    - _Requirements: 8.1-8.4, 9.1-9.5, 10.1-10.5_
