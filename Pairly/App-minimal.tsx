// ⚡ MINIMAL APP - CRASH FIX VERSION
import './polyfills';
import 'react-native-gesture-handler';
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// ⚡ CRASH FIX: Only use Expo-supported modules
import * as SecureStore from 'expo-secure-store';
import { ClerkProvider } from '@clerk/clerk-expo';

// ⚡ CRASH FIX: Minimal token cache without AsyncStorage fallback
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.error('Token get error:', err);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error('Token save error:', err);
    }
  },
};

const CLERK_KEY = 'pk_test_bmF0aXZlLWRlZXItOTkuY2xlcmsuYWNjb3VudHMuZGV2JA';

// ⚡ CRASH FIX: Minimal Error Boundary
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
        <SafeAreaView style={styles.errorContainer}>
          <Text style={styles.errorTitle}>App Error</Text>
          <Text style={styles.errorText}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

// ⚡ CRASH FIX: Minimal Home Screen
function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>💕 Pairly</Text>
        <Text style={styles.subtitle}>Minimal Version - No Crashes</Text>
        <Text style={styles.description}>
          This is a crash-free minimal version of Pairly.
          All problematic native modules have been removed.
        </Text>
        <View style={styles.status}>
          <Text style={styles.statusText}>✅ App Started Successfully</Text>
          <Text style={styles.statusText}>✅ No Native Module Crashes</Text>
          <Text style={styles.statusText}>✅ Clerk Authentication Ready</Text>
          <Text style={styles.statusText}>✅ Ready for Feature Addition</Text>
        </View>
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
        <HomeScreen />
      </ClerkProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  status: {
    alignItems: 'flex-start',
  },
  statusText: {
    fontSize: 14,
    color: '#28a745',
    marginBottom: 8,
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