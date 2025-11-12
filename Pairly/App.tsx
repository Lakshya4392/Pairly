import 'react-native-reanimated';
import './polyfills';
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { ClerkProvider } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

// Import services
import WidgetBackgroundService from './src/services/WidgetBackgroundService';

// Import theme
import { paperTheme } from './src/theme';
import { ThemeProvider } from './src/contexts/ThemeContext';

// Import navigation
import { AppNavigator } from './src/navigation/AppNavigator';

// Simple token cache
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return await SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

// Fallback if env variable fails
const CLERK_KEY = 'pk_test_bmF0aXZlLWRlZXItOTkuY2xlcmsuYWNjb3VudHMuZGV2JA';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            {this.state.error?.message || 'Unknown error occurred'}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  // Apply fonts globally when loaded
  useEffect(() => {
    if (fontsLoaded) {
      // Override default Text component
      const defaultProps = Text.defaultProps || {};
      Text.defaultProps = {
        ...defaultProps,
        style: { fontFamily: 'Inter-Regular' },
      };
      
      // Override default TextInput component
      const defaultInputProps = TextInput.defaultProps || {};
      TextInput.defaultProps = {
        ...defaultInputProps,
        style: { fontFamily: 'Inter-Regular' },
      };
      
      console.log('✅ Inter fonts loaded and applied globally');
    }
  }, [fontsLoaded]);

  // Initialize background services
  useEffect(() => {
    WidgetBackgroundService.initialize();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading Pairly...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
          <ThemeProvider>
            <PaperProvider theme={paperTheme}>
              <AppNavigator />
            </PaperProvider>
          </ThemeProvider>
        </ClerkProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
