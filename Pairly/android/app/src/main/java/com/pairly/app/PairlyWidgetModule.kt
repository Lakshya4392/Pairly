package com.pairly.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * 🎯 SIMPLE MVP Widget Module
 * Only checks if widget exists - NO update logic
 * Widget updates itself by polling backend
 */
class PairlyWidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "PairlyWidget"
    }

    /**
     * Check if widget is on home screen
     */
    @ReactMethod
    fun hasWidgets(promise: Promise) {
        try {
            val appWidgetManager = AppWidgetManager.getInstance(reactApplicationContext)
            val widgetComponent = ComponentName(reactApplicationContext, PremiumCarouselWidgetProvider::class.java)
            val widgetIds = appWidgetManager.getAppWidgetIds(widgetComponent)
            promise.resolve(widgetIds.isNotEmpty())
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Save auth token for widget to use
     */
    @ReactMethod
    fun saveAuthToken(token: String, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("PairlyPrefs", Context.MODE_PRIVATE)
            prefs.edit()
                .putString("auth_token", token)
                .apply()
            
            android.util.Log.d("PairlyWidget", "✅ Auth token saved for widget")
            promise.resolve(true)
        } catch (e: Exception) {
            android.util.Log.e("PairlyWidget", "❌ Failed to save auth token", e)
            promise.reject("ERROR", e.message ?: "Unknown error")
        }
    }

    /**
     * Save backend URL for widget to use
     */
    @ReactMethod
    fun saveBackendUrl(url: String, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("PairlyPrefs", Context.MODE_PRIVATE)
            prefs.edit()
                .putString("backend_url", url)
                .apply()
            
            android.util.Log.d("PairlyWidget", "✅ Backend URL saved for widget")
            promise.resolve(true)
        } catch (e: Exception) {
            android.util.Log.e("PairlyWidget", "❌ Failed to save backend URL", e)
            promise.reject("ERROR", e.message ?: "Unknown error")
        }
    }
}
