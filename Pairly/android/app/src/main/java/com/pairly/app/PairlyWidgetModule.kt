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
            val widgetComponent = ComponentName(reactApplicationContext, PairlyWidgetProvider::class.java)
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
            val intent = Intent(context, PairlyWidgetProvider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra("photoPath", photoPath)
                putExtra("partnerName", partnerName)
                putExtra("timestamp", timestamp.toLong())
            }
            context.sendBroadcast(intent)
            
            // Force update all widgets
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val widgetComponent = ComponentName(context, PairlyWidgetProvider::class.java)
            val widgetIds = appWidgetManager.getAppWidgetIds(widgetComponent)
            
            if (widgetIds.isNotEmpty()) {
                PairlyWidgetProvider().onUpdate(context, appWidgetManager, widgetIds)
            }
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun clearWidget(promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = Intent(context, PairlyWidgetProvider::class.java).apply {
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
