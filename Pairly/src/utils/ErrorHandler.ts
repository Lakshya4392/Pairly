/**
 * Centralized Error Handler
 * Handles all app errors with user-friendly messages
 */

import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  STORAGE = 'STORAGE',
  UPLOAD = 'UPLOAD',
  PAIRING = 'PAIRING',
  PERMISSION = 'PERMISSION',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: any;
  retryable?: boolean;
  action?: () => void;
}

class ErrorHandler {
  /**
   * Handle error with user-friendly message
   */
  handle(error: AppError): void {
    console.error(`[${error.type}]`, error.message, error.originalError);

    // Haptic feedback for errors
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    // Show user-friendly alert
    const title = this.getErrorTitle(error.type);
    const message = this.getUserFriendlyMessage(error);

    if (error.retryable && error.action) {
      Alert.alert(
        title,
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: error.action },
        ]
      );
    } else {
      Alert.alert(title, message, [{ text: 'OK' }]);
    }
  }

  /**
   * Handle network errors
   */
  handleNetworkError(originalError: any, retryAction?: () => void): void {
    this.handle({
      type: ErrorType.NETWORK,
      message: 'Network connection failed',
      originalError,
      retryable: true,
      action: retryAction,
    });
  }

  /**
   * Handle upload errors
   */
  handleUploadError(originalError: any, retryAction?: () => void): void {
    this.handle({
      type: ErrorType.UPLOAD,
      message: 'Failed to upload photo',
      originalError,
      retryable: true,
      action: retryAction,
    });
  }

  /**
   * Handle pairing errors
   */
  handlePairingError(message: string, originalError?: any): void {
    this.handle({
      type: ErrorType.PAIRING,
      message,
      originalError,
      retryable: false,
    });
  }

  /**
   * Handle storage errors
   */
  handleStorageError(originalError: any): void {
    this.handle({
      type: ErrorType.STORAGE,
      message: 'Failed to save data',
      originalError,
      retryable: false,
    });
  }

  /**
   * Handle permission errors
   */
  handlePermissionError(permission: string): void {
    this.handle({
      type: ErrorType.PERMISSION,
      message: `${permission} permission is required`,
      retryable: false,
    });
  }

  /**
   * Get error title based on type
   */
  private getErrorTitle(type: ErrorType): string {
    switch (type) {
      case ErrorType.NETWORK:
        return 'Connection Error';
      case ErrorType.AUTH:
        return 'Authentication Error';
      case ErrorType.STORAGE:
        return 'Storage Error';
      case ErrorType.UPLOAD:
        return 'Upload Failed';
      case ErrorType.PAIRING:
        return 'Pairing Error';
      case ErrorType.PERMISSION:
        return 'Permission Required';
      default:
        return 'Error';
    }
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(error: AppError): string {
    switch (error.type) {
      case ErrorType.NETWORK:
        return 'Please check your internet connection and try again.';
      
      case ErrorType.AUTH:
        return 'Please sign in again to continue.';
      
      case ErrorType.STORAGE:
        return 'Unable to save data. Please check your device storage.';
      
      case ErrorType.UPLOAD:
        return 'Failed to send photo. Your photo is saved locally and will be sent when connection is restored.';
      
      case ErrorType.PAIRING:
        return error.message || 'Unable to pair with partner. Please try again.';
      
      case ErrorType.PERMISSION:
        return `${error.message}. Please enable it in Settings.`;
      
      default:
        return error.message || 'Something went wrong. Please try again.';
    }
  }

  /**
   * Log error to analytics/monitoring service
   */
  logError(error: AppError): void {
    // TODO: Send to Sentry or other monitoring service
    console.error('[ErrorHandler]', {
      type: error.type,
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Show success message
   */
  showSuccess(message: string): void {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Success', message, [{ text: 'OK' }]);
  }

  /**
   * Show info message
   */
  showInfo(title: string, message: string): void {
    Alert.alert(title, message, [{ text: 'OK' }]);
  }
}

export default new ErrorHandler();
