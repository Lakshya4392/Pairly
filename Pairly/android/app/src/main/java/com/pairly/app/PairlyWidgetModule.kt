package com.pairly.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.pairly.app.widget.PairlyWidget

class PairlyWidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "PairlyWidget"
    }

    /**
     * Check if any Pairly widgets are added to home screen
     */
    @ReactMethod
    fun hasWidgets(promise: Promise) {
        try {
            val appWidgetManager = AppWidgetManager.getInstance(reactApplicationContext)
            val componentName = ComponentName(reactApplicationContext, PairlyWidget::class.java)
            val widgetIds = appWidgetManager.getAppWidgetIds(componentName)
            
            println("📱 Widget: hasWidgets check - found ${widgetIds.size} widgets")
            promise.resolve(widgetIds.isNotEmpty())
        } catch (e: Exception) {
            println("❌ Widget: hasWidgets error: ${e.message}")
            promise.resolve(false)
        }
    }

    /**
     * Save auth token to SharedPreferences for widget access
     */
    @ReactMethod
    fun saveAuthToken(token: String, promise: Promise) {
        try {
            val sharedPrefs = reactApplicationContext.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
            sharedPrefs.edit().putString("auth_token", token).apply()
            println("✅ Widget: Auth token saved to SharedPreferences")
            
            // Trigger widget refresh
            refreshAllWidgets()
            
            promise.resolve(true)
        } catch (e: Exception) {
            println("❌ Widget: saveAuthToken error: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Save backend URL to SharedPreferences for widget access
     */
    @ReactMethod
    fun saveBackendUrl(url: String, promise: Promise) {
        try {
            val sharedPrefs = reactApplicationContext.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
            sharedPrefs.edit().putString("backend_url", url).apply()
            println("✅ Widget: Backend URL saved: $url")
            promise.resolve(true)
        } catch (e: Exception) {
            println("❌ Widget: saveBackendUrl error: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Save user ID to SharedPreferences for widget access
     */
    @ReactMethod
    fun saveUserId(userId: String, promise: Promise) {
        try {
            val sharedPrefs = reactApplicationContext.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
            sharedPrefs.edit().putString("user_id", userId).apply()
            println("✅ Widget: User ID saved")
            promise.resolve(true)
        } catch (e: Exception) {
            println("❌ Widget: saveUserId error: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Manually trigger widget refresh
     */
    @ReactMethod
    fun refreshWidget(promise: Promise) {
        try {
            refreshAllWidgets()
            promise.resolve(true)
        } catch (e: Exception) {
            println("❌ Widget: refreshWidget error: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Internal: Refresh all Pairly widgets
     */
    private fun refreshAllWidgets() {
        try {
            val intent = Intent(reactApplicationContext, PairlyWidget::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
            
            val appWidgetManager = AppWidgetManager.getInstance(reactApplicationContext)
            val componentName = ComponentName(reactApplicationContext, PairlyWidget::class.java)
            val widgetIds = appWidgetManager.getAppWidgetIds(componentName)
            
            if (widgetIds.isNotEmpty()) {
                intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds)
                reactApplicationContext.sendBroadcast(intent)
                println("🔄 Widget: Refresh broadcast sent for ${widgetIds.size} widgets")
            }
        } catch (e: Exception) {
            println("⚠️ Widget: refreshAllWidgets error: ${e.message}")
        }
    }
}
