package com.pairly.app

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

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
            val intent = android.content.Intent("com.pairly.app.widget.REFRESH")
            intent.setPackage(reactApplicationContext.packageName)
            reactApplicationContext.sendBroadcast(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}