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

// Warm up browser for faster OAuth
WebBrowser.maybeCompleteAuthSession();

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { isSignedIn } = useAuth();
  const { user } = useUser();
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
    if (isSignedIn) {
      // Navigate immediately, sync in background
      onAuthSuccess();
      
      // Sync in background (non-blocking)
      syncUserInBackground();
    }
  }, [isSignedIn]);

  const syncUserInBackground = async () => {
    try {
      // Wait a bit for user object to be available
      let attempts = 0;
      while (!user && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!user) {
        console.log('⚠️ User object not available after waiting');
        return;
      }
      
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
      const result = await UserSyncService.syncUserWithBackend(userData);
      
      if (result.success && result.user) {
        console.log('✅ User synced - Premium:', result.user.isPremium);
      } else {
        // Queue for retry if backend offline
        console.log('💡 Backend offline, queued for sync');
        const BackgroundSyncService = (await import('../services/BackgroundSyncService')).default;
        await BackgroundSyncService.queueUserSync(userData);
      }
    } catch (error) {
      // Silent fail - queue for retry
      try {
        const BackgroundSyncService = (await import('../services/BackgroundSyncService')).default;
        await BackgroundSyncService.queueUserSync({
          clerkId: user?.id || '',
          email: user?.primaryEmailAddress?.emailAddress || '',
          displayName: user?.fullName || user?.username || 'User',
        });
      } catch (queueError) {
        // Ignore - app will work with local data
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      console.log('🔵 Starting Google OAuth...');
      console.log('💡 TIP: After clicking Continue in browser, manually close the browser and return to app');
      
      // Start OAuth flow
      const { createdSessionId, signIn, signUp, setActive } = await startOAuthFlow();
      
      console.log('🔵 OAuth flow returned');
      console.log('🔵 Result:', {
        hasSession: !!createdSessionId,
        signInStatus: signIn?.status,
        signUpStatus: signUp?.status,
      });

      // Try to dismiss browser
      try {
        await WebBrowser.dismissBrowser();
        console.log('🔵 Browser dismissed');
      } catch (e) {
        console.log('🔵 Browser already closed');
      }

      // Direct session created
      if (createdSessionId) {
        console.log('✅ Activating session...');
        await setActive!({ session: createdSessionId });
        console.log('✅ Signed in successfully!');
        return;
      }

      // SignUp completed
      if (signUp?.status === 'complete' && signUp.createdSessionId) {
        console.log('✅ Activating signup session...');
        await setActive!({ session: signUp.createdSessionId });
        console.log('✅ Signed up successfully!');
        return;
      }

      // SignIn completed
      if (signIn?.status === 'complete' && signIn.createdSessionId) {
        console.log('✅ Activating signin session...');
        await setActive!({ session: signIn.createdSessionId });
        console.log('✅ Signed in successfully!');
        return;
      }

      // OAuth incomplete - show helpful message
      console.log('⚠️ OAuth incomplete - needs_identifier status');
      console.log('💡 SOLUTION: Use Clerk development keys OR manually close browser after clicking Continue');
      
      setErrorMessage('Please close the browser manually after clicking Continue, then return to the app.');
      setShowErrorAlert(true);
      
    } catch (error: any) {
      console.error('❌ OAuth error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      setErrorMessage(error.message || 'Failed to sign in with Google.');
      setShowErrorAlert(true);
    } finally {
      setLoading(false);
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
