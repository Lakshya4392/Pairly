package com.pairly.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class PairlyWidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "PairlyWidget"
    }

    @ReactMethod
    fun hasWidgets(promise: Promise) {
        try {
            val appWidgetManager = AppWidgetManager.getInstance(reactApplicationContext)
            // Check for premium carousel widget
            val widgetComponent = ComponentName(reactApplicationContext, PremiumCarouselWidgetProvider::class.java)
            val widgetIds = appWidgetManager.getAppWidgetIds(widgetComponent)
            promise.resolve(widgetIds.isNotEmpty())
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun updateWidget(photoPath: String, partnerName: String, timestamp: Double, promise: Promise) {
        try {
            val context = reactApplicationContext
            
            // Store partner name in SharedPreferences for widget access
            val prefs = context.getSharedPreferences("PairlyPrefs", Context.MODE_PRIVATE)
            prefs.edit().putString("partner_name", partnerName).apply()
            
            android.util.Log.d("PairlyWidget", "📸 New photo saved: $photoPath")
            android.util.Log.d("PairlyWidget", "👤 Partner: $partnerName")
            
            // INSTANT UPDATE - Force immediate widget refresh
            PremiumCarouselWidgetProvider.forceUpdate(context)
            
            // Also send broadcast for redundancy
            val intent = Intent(context, PremiumCarouselWidgetProvider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
            context.sendBroadcast(intent)
            
            android.util.Log.d("PairlyWidget", "✅ Widget force updated instantly")
            promise.resolve(true)
        } catch (e: Exception) {
            android.util.Log.e("PairlyWidget", "❌ Update widget failed", e)
            promise.reject("ERROR", e.message ?: "Unknown error")
        }
    }

    @ReactMethod
    fun clearWidget(promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = Intent(context, PremiumCarouselWidgetProvider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra("clear", true)
            }
            context.sendBroadcast(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
