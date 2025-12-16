import React, { useState } from 'react';
import { View, Text, StyleSheet, StatusBar, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth, useOAuth, useSignIn, useSignUp, useUser } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomAlert } from '../components/CustomAlert';
import { useTheme } from '../contexts/ThemeContext';
import { colors as defaultColors, gradients } from '../theme/colorsIOS';
import { spacing, layout, borderRadius } from '../theme/spacingIOS';
import { shadows } from '../theme/shadowsIOS';
import { API_CONFIG } from '../config/api.config';

// Warm up browser for faster OAuth
WebBrowser.maybeCompleteAuthSession();

// Configure OAuth redirect with proper browser settings
const useWarmUpBrowser = () => {
  React.useEffect(() => {
    // Warm up the browser for faster OAuth
    const warmUp = async () => {
      try {
        await WebBrowser.warmUpAsync();
        console.log('✅ Browser warmed up');
      } catch (error) {
        console.log('⚠️ Browser warm up failed (non-critical):', error);
      }
    };

    warmUp();

    return () => {
      WebBrowser.coolDownAsync().catch(() => {
        // Ignore cooldown errors
      });
    };
  }, []);
};

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  // Warm up browser for OAuth
  useWarmUpBrowser();

  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const { signIn, setActive } = useSignIn();
  const { signUp, setActive: setActiveSignUp } = useSignUp();

  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'oauth' | 'verify'>('oauth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState<any>(null);
  const [showCodeSentAlert, setShowCodeSentAlert] = useState(false);
  const [showVerifySuccessAlert, setShowVerifySuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const otpInputs = React.useRef<any[]>([]);
  const hiddenInputRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (isSignedIn && user) {
      checkWaitlistStatus();
    }
  }, [isSignedIn, user]);

  const checkWaitlistStatus = async () => {
    try {
      // 1. Sync user first (to ensure they exist in DB)
      await syncUserInBackground();

      // 2. NEW: Verify email and get premium status
      console.log('🔍 Verifying email and checking premium status...');

      const response = await fetch(`${API_CONFIG.baseUrl}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user?.primaryEmailAddress?.emailAddress,
          clerkId: user?.id
        })
      });

      const data = await response.json();
      console.log('✅ Verify email result:', data);

      if (data.verified) {
        // Store premium info in AsyncStorage
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        await AsyncStorage.setItem('referralCode', data.referralCode || '');
        await AsyncStorage.setItem('isPremium', data.isPremium ? 'true' : 'false');
        await AsyncStorage.setItem('premiumDaysRemaining', data.premiumDaysRemaining?.toString() || '0');
        await AsyncStorage.setItem('premiumExpiresAt', data.premiumExpiresAt || '');
        await AsyncStorage.setItem('referralCount', data.referralCount?.toString() || '0');
        await AsyncStorage.setItem('userEmail', user?.primaryEmailAddress?.emailAddress || '');
        await AsyncStorage.setItem('clerkId', user?.id || '');

        // Show premium status
        if (data.isPremium) {
          console.log(`⭐ Premium active: ${data.premiumDaysRemaining} days remaining`);
        } else {
          console.log('⏰ Premium expired - refer friends to unlock!');
        }

        // Allow access
        onAuthSuccess();
      } else {
        // Not verified or waitlist period
        setErrorMessage(data.message || 'Please join the waitlist first at pairly-iota.vercel.app');
        setShowErrorAlert(true);
      }
    } catch (error) {
      console.error('❌ Error verifying email:', error);
      setErrorMessage('Unable to verify email. Please check your connection.');
      setShowErrorAlert(true);
    }
  };

  const syncUserInBackground = async () => {
    try {
      if (!user) return;

      const userData = {
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress || '',
        displayName: user.fullName || user.username || 'User',
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        photoUrl: user.imageUrl || undefined,
        phoneNumber: user.primaryPhoneNumber?.phoneNumber || undefined,
      };

      console.log('🔄 Syncing user with backend...');

      // Try immediate sync first (non-blocking)
      const UserSyncService = (await import('../services/UserSyncService')).default;
      await UserSyncService.syncUserWithBackend(userData);

    } catch (error) {
      console.log('⚠️ User sync failed (non-critical):', error);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      console.log('🔵 ========== GOOGLE OAUTH START ==========');
      console.log('🔵 Timestamp:', new Date().toISOString());

      // Detect environment
      const isExpoGo = __DEV__ && !process.env.EXPO_PUBLIC_IS_STANDALONE;
      console.log('🔵 Environment:', isExpoGo ? 'Expo Go' : 'Standalone APK');
      console.log('🔵 __DEV__:', __DEV__);

      // Configure browser options for better compatibility
      const browserOptions = {
        // Use default browser (more reliable than custom tabs)
        preferEphemeralSession: false,
        // Show toolbar for better UX
        showTitle: true,
        // Enable bar collapsing
        enableBarCollapsing: false,
      };

      console.log('🔵 Browser options:', browserOptions);

      // For APK: Use explicit redirect URL
      // For Expo Go: Let Clerk auto-detect
      let result;
      if (!isExpoGo) {
        // APK/Production: Use explicit redirect URL
        const redirectUrl = 'pairly://oauth-native-callback';
        console.log('🔵 Using explicit redirect URL:', redirectUrl);
        console.log('🔵 Make sure this is in Clerk Dashboard!');

        try {
          result = await startOAuthFlow({
            redirectUrl: redirectUrl,
          });
        } catch (flowError: any) {
          console.error('❌ OAuth flow error:', flowError);

          // Check if it's a browser error
          if (flowError.message?.includes('openBrowserAsync') ||
            flowError.message?.includes('browser')) {
            console.log('⚠️ Browser error detected, trying alternative approach');

            // Try without explicit redirect URL as fallback
            result = await startOAuthFlow();
          } else {
            throw flowError;
          }
        }
      } else {
        // Expo Go: Auto-detect
        console.log('🔵 Using auto-detect for Expo Go');
        result = await startOAuthFlow();
      }

      console.log('🔵 ========== OAUTH FLOW RETURNED ==========');
      console.log('🔵 Has createdSessionId:', !!result.createdSessionId);
      console.log('🔵 SignIn status:', result.signIn?.status);
      console.log('🔵 SignUp status:', result.signUp?.status);
      console.log('🔵 Full result:', JSON.stringify({
        hasSession: !!result.createdSessionId,
        signInStatus: result.signIn?.status,
        signUpStatus: result.signUp?.status,
        signInSessionId: result.signIn?.createdSessionId,
        signUpSessionId: result.signUp?.createdSessionId,
      }, null, 2));


      // Try to dismiss browser
      try {
        await WebBrowser.dismissBrowser();
        console.log('🔵 Browser dismissed successfully');
      } catch (e) {
        console.log('🔵 Browser already closed or auto-dismissed');
      }

      // ⚡ FIX: Add small delay to let browser redirect complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Helper function to activate session with retry
      const activateSession = async (sessionId: string): Promise<boolean> => {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            console.log(`🔵 Activating session (attempt ${attempt}/3)...`);
            await result.setActive!({ session: sessionId });
            console.log('✅ Session activated!');
            return true;
          } catch (err: any) {
            console.log(`⚠️ Session activation attempt ${attempt} failed:`, err.message);
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }
        return false;
      };

      // Check for direct session
      if (result.createdSessionId) {
        console.log('✅ Direct session created!');
        console.log('✅ Session ID:', result.createdSessionId);
        const activated = await activateSession(result.createdSessionId);
        if (activated) {
          console.log('✅ Google sign-in successful!');
          console.log('🔵 ========== OAUTH SUCCESS ==========');
          return;
        }
      }

      // Check SignUp flow
      if (result.signUp?.status === 'complete' && result.signUp.createdSessionId) {
        console.log('✅ Sign-up flow completed!');
        console.log('✅ Session ID:', result.signUp.createdSessionId);
        const activated = await activateSession(result.signUp.createdSessionId);
        if (activated) {
          console.log('✅ Account created successfully!');
          console.log('🔵 ========== OAUTH SUCCESS (SIGNUP) ==========');
          return;
        }
      }

      // Check SignIn flow
      if (result.signIn?.status === 'complete' && result.signIn.createdSessionId) {
        console.log('✅ Sign-in flow completed!');
        console.log('✅ Session ID:', result.signIn.createdSessionId);
        const activated = await activateSession(result.signIn.createdSessionId);
        if (activated) {
          console.log('✅ Signed in successfully!');
          console.log('🔵 ========== OAUTH SUCCESS (SIGNIN) ==========');
          return;
        }
      }

      // Handle incomplete states
      console.log('⚠️ ========== OAUTH INCOMPLETE ==========');
      console.log('⚠️ SignIn status:', result.signIn?.status);
      console.log('⚠️ SignUp status:', result.signUp?.status);

      if (result.signIn?.status === 'needs_identifier') {
        console.log('⚠️ OAuth needs identifier - user may need to complete sign-in');
        setErrorMessage('Please complete the sign-in in your browser, then return to the app.');
        setShowErrorAlert(true);
        return;
      }

      if (result.signUp?.status === 'missing_requirements') {
        console.log('⚠️ OAuth missing requirements');
        setErrorMessage('Additional information required. Please try again.');
        setShowErrorAlert(true);
        return;
      }

      // No session created
      console.log('⚠️ No session created - OAuth may have been cancelled');
      console.log('⚠️ User may have closed browser before completing sign-in');
      setErrorMessage('Sign-in was not completed. Please try again and complete the sign-in process.');
      setShowErrorAlert(true);

    } catch (error: any) {
      console.error('❌ ========== OAUTH ERROR ==========');
      console.error('❌ Error message:', error.message);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error name:', error.name);
      console.error('❌ Full error:', JSON.stringify(error, null, 2));
      console.error('❌ Stack trace:', error.stack);

      // Detailed error handling
      let userMessage = 'Failed to sign in with Google. ';

      if (error.message?.includes('cancelled') || error.message?.includes('canceled')) {
        console.log('ℹ️ User cancelled OAuth flow');
        userMessage = 'Sign-in was cancelled.';
      } else if (error.message?.includes('network') || error.message?.includes('Network')) {
        console.log('ℹ️ Network error during OAuth');
        userMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message?.includes('redirect')) {
        console.log('ℹ️ Redirect error - check Clerk configuration');
        userMessage = 'OAuth redirect failed. Please contact support.';
      } else if (error.code === 'ERR_OAUTHFLOW_FAILED') {
        console.log('ℹ️ OAuth flow failed - check Clerk and Google Cloud Console configuration');
        userMessage = 'OAuth configuration error. Please contact support.';
      } else {
        console.log('ℹ️ Unknown OAuth error');
        userMessage = error.message || 'An unexpected error occurred. Please try again.';
      }

      setErrorMessage(userMessage);
      setShowErrorAlert(true);
      console.error('❌ ========== OAUTH FAILED ==========');
    } finally {
      setLoading(false);
      console.log('🔵 ========== OAUTH FLOW END ==========');
    }
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      setErrorMessage('Please enter email and password');
      setShowErrorAlert(true);
      return;
    }

    try {
      setLoading(true);
      const result = await signIn?.create({
        identifier: email,
        password,
      });

      if (result?.status === 'complete' && setActive) {
        await setActive({ session: result.createdSessionId });
        // Don't wait for sync, it will happen in useEffect
      } else if (result?.status === 'needs_identifier') {
        // Handle cases where additional verification is needed
        setErrorMessage('Verification required. Please check your email.');
        setShowErrorAlert(true);
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      setErrorMessage(error.errors?.[0]?.message || 'Please check your credentials');
      setShowErrorAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (!email || !password || !name) {
      setErrorMessage('Please fill all fields');
      setShowErrorAlert(true);
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      setShowErrorAlert(true);
      return;
    }

    try {
      setLoading(true);
      const result = await signUp?.create({
        emailAddress: email,
        password,
        firstName: name.split(' ')[0],
        lastName: name.split(' ')[1] || '',
      });

      if (result?.status === 'complete' && setActiveSignUp) {
        await setActiveSignUp({ session: result.createdSessionId });
        onAuthSuccess();
      } else if (result?.status === 'missing_requirements') {
        // Send email verification code
        try {
          await result.prepareEmailAddressVerification({ strategy: 'email_code' });
          setPendingVerification(result);
          setAuthMode('verify');

          // Show custom success alert
          setShowCodeSentAlert(true);
        } catch (verifyError: any) {
          console.error('Email verification preparation error:', verifyError);
          setErrorMessage('Failed to send verification email. Please try again.');
          setShowErrorAlert(true);
        }
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      const errMsg = error.errors?.[0]?.message || 'Please try again';
      setErrorMessage(errMsg);
      setShowErrorAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code');
      setShowErrorAlert(true);
      return;
    }

    try {
      setLoading(true);
      const result = await pendingVerification?.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (result?.status === 'complete' && setActiveSignUp) {
        await setActiveSignUp({ session: result.createdSessionId });
        setShowVerifySuccessAlert(true);
        setTimeout(() => {
          onAuthSuccess();
        }, 1500);
      } else {
        setErrorMessage('Verification incomplete. Please try again.');
        setShowErrorAlert(true);
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      const errMsg = error.errors?.[0]?.message || 'Invalid or expired code';
      setErrorMessage(errMsg);
      setShowErrorAlert(true);

      // Clear the code if it's invalid
      if (errorMessage.toLowerCase().includes('invalid')) {
        setVerificationCode('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setLoading(true);
      await pendingVerification?.prepareEmailAddressVerification({ strategy: 'email_code' });
      setVerificationCode(''); // Clear current code
      setShowCodeSentAlert(true);
    } catch (error: any) {
      console.error('Resend error:', error);
      setErrorMessage('Failed to resend verification code. Please try again.');
      setShowErrorAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, '');

    if (numericText.length <= 1) {
      const newCode = verificationCode.split('');
      newCode[index] = numericText;
      const updatedCode = newCode.join('');
      setVerificationCode(updatedCode);

      // Auto-focus next input
      if (numericText && index < 5) {
        otpInputs.current[index + 1]?.focus();
      }
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !verificationCode[index] && index > 0) {
      // Focus previous input on backspace
      otpInputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header - Only show when not in verify mode */}
        {authMode !== 'verify' && (
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                style={styles.logoGradient}
              >
                <Ionicons name="heart" size={32} color="white" />
              </LinearGradient>
            </View>

            <Text style={styles.appName}>Pairly</Text>
          </View>
        )}

        {/* Auth Section */}
        <View style={styles.authContainer}>
          {authMode !== 'verify' && (
            <>
              <Text style={styles.welcomeText}>Welcome back</Text>
              <Text style={styles.subtitle}>
                Sign in to continue sharing moments
              </Text>
            </>
          )}

          {authMode === 'oauth' && (
            <>
              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleSignIn}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-google" size={20} color={colors.text} />
                <Text style={styles.googleButtonText}>
                  {loading ? 'Signing in...' : 'Continue with Google'}
                </Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.emailButton}
                onPress={() => setAuthMode('signin')}
                activeOpacity={0.8}
              >
                <Ionicons name="mail-outline" size={20} color={colors.primary} />
                <Text style={styles.emailButtonText}>Sign in with Email</Text>
              </TouchableOpacity>
            </>
          )}

          {authMode === 'signin' && (
            <>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleEmailSignIn}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryLight]}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <Text style={styles.primaryButtonText}>Signing in...</Text>
                  ) : (
                    <Text style={styles.primaryButtonText}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.switchContainer}>
                <TouchableOpacity onPress={() => setAuthMode('signup')}>
                  <Text style={styles.switchText}>Don't have an account? <Text style={styles.switchTextBold}>Sign Up</Text></Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAuthMode('oauth')} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={16} color={colors.textTertiary} />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {authMode === 'signup' && (
            <>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password (8+ characters)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleEmailSignUp}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryLight]}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <Text style={styles.primaryButtonText}>Creating account...</Text>
                  ) : (
                    <Text style={styles.primaryButtonText}>Create Account</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.switchContainer}>
                <TouchableOpacity onPress={() => setAuthMode('signin')}>
                  <Text style={styles.switchText}>Already have an account? <Text style={styles.switchTextBold}>Sign In</Text></Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAuthMode('oauth')} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={16} color={colors.textTertiary} />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {authMode === 'verify' && (
            <>
              <View style={styles.verifyContainer}>
                <Text style={styles.verifyTitle}>Enter verification code</Text>
                <Text style={styles.emailText}>{email}</Text>
              </View>

              <View style={styles.otpContainer}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <View key={index} style={styles.otpInputWrapper}>
                    <TextInput
                      style={[
                        styles.otpInput,
                        verificationCode.length > index && styles.otpInputFilled
                      ]}
                      value={verificationCode[index] || ''}
                      onChangeText={(text) => handleOtpChange(text, index)}
                      onKeyPress={(e) => handleOtpKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      textAlign="center"
                      selectTextOnFocus
                      ref={(ref) => {
                        if (ref) {
                          otpInputs.current[index] = ref;
                        }
                      }}
                    />
                  </View>
                ))}
              </View>

              <TextInput
                style={styles.hiddenInput}
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                ref={hiddenInputRef}
              />

              <TouchableOpacity
                style={[styles.primaryButton, verificationCode.length !== 6 && styles.primaryButtonDisabled]}
                onPress={handleVerifyEmail}
                disabled={loading || verificationCode.length !== 6}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={verificationCode.length === 6 ? [colors.primary, colors.primaryLight] : [colors.disabled, colors.disabled]}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <Text style={styles.primaryButtonText}>Verifying...</Text>
                  ) : (
                    <Text style={[styles.primaryButtonText, verificationCode.length !== 6 && styles.primaryButtonTextDisabled]}>
                      Verify Email
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.switchContainer}>
                <TouchableOpacity onPress={handleResendCode} style={styles.resendButton}>
                  <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                  <Text style={styles.resendButtonText}>Resend code</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  setAuthMode('signup');
                  setPendingVerification(null);
                  setVerificationCode('');
                }} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={16} color={colors.textTertiary} />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {authMode !== 'verify' && (
            <Text style={styles.privacyText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Code Sent Alert */}
      <CustomAlert
        visible={showCodeSentAlert}
        title="Verification Code Sent! 📧"
        message={`We've sent a 6-digit code to ${email}. Please check your inbox and spam folder.`}
        icon="mail"
        iconColor={colors.success}
        buttons={[
          {
            text: 'Got it!',
            style: 'default',
            onPress: () => setShowCodeSentAlert(false),
          },
        ]}
        onClose={() => setShowCodeSentAlert(false)}
      />

      {/* Verification Success Alert */}
      <CustomAlert
        visible={showVerifySuccessAlert}
        title="Account Created! 🎉"
        message="Your account has been successfully created. Welcome to Pairly!"
        icon="checkmark-circle"
        iconColor={colors.success}
        buttons={[
          {
            text: 'Continue',
            style: 'default',
            onPress: () => setShowVerifySuccessAlert(false),
          },
        ]}
        onClose={() => setShowVerifySuccessAlert(false)}
      />

      {/* Error Alert */}
      <CustomAlert
        visible={showErrorAlert}
        title="Oops!"
        message={errorMessage}
        icon="alert-circle"
        iconColor={colors.error}
        buttons={[
          {
            text: 'Try Again',
            style: 'default',
            onPress: () => setShowErrorAlert(false),
          },
        ]}
        onClose={() => setShowErrorAlert(false)}
      />
    </View>
  );
};

const createStyles = (colors: typeof defaultColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPaddingHorizontal,
  },

  // Header Section
  header: {
    alignItems: 'center',
    paddingTop: spacing.massive,
    paddingBottom: spacing.xxl,
  },
  logoContainer: {
    marginBottom: spacing.lg,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  appName: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    lineHeight: 32,
    color: colors.text,
    textAlign: 'center',
  },

  // Auth Container
  authContainer: {
    flex: 1,
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  welcomeText: {
    fontFamily: 'Inter-SemiBold', fontSize: 24,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
    lineHeight: 24,
  },

  // Google Button
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: layout.buttonHeight,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 0,
    marginBottom: spacing.lg,
    gap: spacing.md,
    ...shadows.md,
  },
  googleButtonText: {
    fontFamily: 'Inter-Medium', fontSize: 16,
    color: colors.text,
  },

  // Email Button
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: layout.buttonHeight,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  emailButtonText: {
    fontFamily: 'Inter-Medium', fontSize: 16,
    color: colors.primary,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xxl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 14,
    color: colors.textTertiary,
    marginHorizontal: spacing.lg,
    fontFamily: 'Inter-Regular',
  },

  // Input Fields
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: layout.inputHeight,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  inputIcon: {
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontFamily: 'Inter-Regular',
  },

  // Primary Button
  primaryButton: {
    height: layout.buttonHeight,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xxl,
    ...shadows.primary,
  },
  primaryButtonDisabled: {
    ...shadows.none,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.full,
  },
  primaryButtonText: {
    fontFamily: 'Inter-SemiBold', fontSize: 16,
    color: 'white',
  },
  primaryButtonTextDisabled: {
    color: colors.disabledText,
  },

  // Switch Container
  switchContainer: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  switchText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  switchTextBold: {
    fontFamily: 'Inter-SemiBold',
    color: colors.primary,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButtonText: {
    fontSize: 14,
    color: colors.textTertiary,
  },

  // Verification Screen
  verifyContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  verifyTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 22,
    lineHeight: 28,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  emailText: {
    fontSize: 15,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },

  // OTP Input
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xxxl,
    paddingHorizontal: spacing.sm,
  },
  otpInputWrapper: {
    width: 48,
    height: 56,
  },
  otpInput: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold', fontSize: 20,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  otpInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.backgroundSecondary,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },

  // Resend Button
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resendButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: 'Inter-Medium',
  },

  // Privacy Text
  privacyText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
});
