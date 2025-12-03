package com.pairly.app

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    super.onCreate(null)
    
    // Handle deep link on app launch
    handleDeepLink(intent)
  }
  
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    // Handle deep link when app is already running
    setIntent(intent)
    handleDeepLink(intent)
  }
  
  private fun handleDeepLink(intent: Intent?) {
    val action = intent?.action
    val data: Uri? = intent?.data
    
    if (Intent.ACTION_VIEW == action && data != null) {
      Log.d("MainActivity", "🔗 Deep link received: $data")
      Log.d("MainActivity", "🔗 Scheme: ${data.scheme}")
      Log.d("MainActivity", "🔗 Host: ${data.host}")
      Log.d("MainActivity", "🔗 Path: ${data.path}")
      
      // Log for OAuth callback
      if (data.host == "oauth-native-callback" || data.path?.contains("oauth") == true) {
        Log.d("MainActivity", "✅ OAuth callback detected!")
      }
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
