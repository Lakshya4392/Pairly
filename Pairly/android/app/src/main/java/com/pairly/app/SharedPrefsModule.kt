package com.pairly.app

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

import android.appwidget.AppWidgetManager
import android.content.Intent
import android.content.ComponentName
import com.pairly.app.widget.PairlyWidget

class SharedPrefsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "SharedPrefsModule"
    }

    @ReactMethod
    fun setString(key: String, value: String, promise: Promise) {
        try {
            val sharedPrefs = reactApplicationContext.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
            val editor = sharedPrefs.edit()
            editor.putString(key, value)
            editor.apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun getString(key: String, promise: Promise) {
        try {
            val sharedPrefs = reactApplicationContext.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
            val value = sharedPrefs.getString(key, null)
            promise.resolve(value)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun remove(key: String, promise: Promise) {
        try {
            val sharedPrefs = reactApplicationContext.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
            val editor = sharedPrefs.edit()
            editor.remove(key)
            editor.apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun notifyWidgetUpdate(promise: Promise) {
        try {
            val context = reactApplicationContext
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, PairlyWidget::class.java)
            val widgetIds = appWidgetManager.getAppWidgetIds(componentName)

            if (widgetIds.isNotEmpty()) {
                // Debug Toast
                android.os.Handler(android.os.Looper.getMainLooper()).post {
                    android.widget.Toast.makeText(context, "Refreshing ${widgetIds.size} Widgets 🔄", android.widget.Toast.LENGTH_SHORT).show()
                }

                // ⚡ FORCE UPDATE: Call static helper on Widget class
                // This updates views directly (instant) AND sends broadcast (backup)
                PairlyWidget.updateAllWidgets(context)
                promise.resolve(true)
            } else {
                android.os.Handler(android.os.Looper.getMainLooper()).post {
                   android.widget.Toast.makeText(context, "No Widgets Found ⚠️", android.widget.Toast.LENGTH_SHORT).show()
                }
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}