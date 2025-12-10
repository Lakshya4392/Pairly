package com.pairly.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.SystemClock
import android.util.Base64
import android.util.Log
import android.widget.RemoteViews
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * 🎯 SIMPLE 2x2 Widget - Bulletproof Design
 * Shows default state immediately, then polls for updates
 */
class SimpleWidgetProvider : AppWidgetProvider() {
    
    companion object {
        private const val TAG = "SimpleWidget"
        private const val ACTION_REFRESH = "com.pairly.SIMPLE_WIDGET_REFRESH"
        private const val REFRESH_INTERVAL = 10_000L // 10 seconds
    }
    
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        Log.d(TAG, "🔄 Widget onUpdate called for ${appWidgetIds.size} widget(s)")
        
        // STEP 1: Immediately show default state for all widgets
        for (appWidgetId in appWidgetIds) {
            showDefaultState(context, appWidgetManager, appWidgetId)
        }
        
        // STEP 2: Try to fetch and update with real data in background
        GlobalScope.launch {
            try {
                val moment = fetchLatestMoment(context)
                if (moment != null) {
                    for (appWidgetId in appWidgetIds) {
                        updateWithPhoto(context, appWidgetManager, appWidgetId, moment)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Background fetch failed", e)
                // Keep default state - no problem
            }
        }
    }
    
    /**
     * Show default state - ALWAYS WORKS
     */
    private fun showDefaultState(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        try {
            val views = RemoteViews(context.packageName, R.layout.simple_widget)
            
            // Show default container, hide photo container
            views.setViewVisibility(R.id.default_container, android.view.View.VISIBLE)
            views.setViewVisibility(R.id.photo_container, android.view.View.GONE)
            
            // Set default text
            views.setTextViewText(R.id.widget_title, "Pairly")
            views.setTextViewText(R.id.widget_subtitle, "Waiting for moments...")
            
            // Set click to open app
            val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (intent != null) {
                val pendingIntent = PendingIntent.getActivity(
                    context, appWidgetId, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
            }
            
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(TAG, "✅ Default state shown for widget $appWidgetId")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error showing default state", e)
        }
    }
    
    /**
     * Update with photo
     */
    private fun updateWithPhoto(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        moment: MomentData
    ) {
        try {
            val views = RemoteViews(context.packageName, R.layout.simple_widget)
            
            // Try to decode photo
            val bitmap = decodeBase64ToBitmap(moment.photoBase64)
            if (bitmap != null) {
                // Hide default container, show photo container
                views.setViewVisibility(R.id.default_container, android.view.View.GONE)
                views.setViewVisibility(R.id.photo_container, android.view.View.VISIBLE)
                
                // Set photo
                views.setImageViewBitmap(R.id.widget_image, bitmap)
                
                // Set partner info
                views.setTextViewText(R.id.partner_name, moment.partnerName)
                views.setTextViewText(R.id.time_ago, getTimeAgo(moment.sentAt))
                
                Log.d(TAG, "✅ Photo updated for widget $appWidgetId from ${moment.partnerName}")
            } else {
                // Keep default state if photo decode fails
                Log.w(TAG, "Failed to decode photo, keeping default state")
            }
            
            appWidgetManager.updateAppWidget(appWidgetId, views)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error updating with photo", e)
        }
    }
    
    /**
     * Fetch latest moment from backend
     */
    private suspend fun fetchLatestMoment(context: Context): MomentData? = withContext(Dispatchers.IO) {
        try {
            val prefs = context.getSharedPreferences("PairlyPrefs", Context.MODE_PRIVATE)
            val authToken = prefs.getString("auth_token", null) ?: return@withContext null
            val backendUrl = prefs.getString("backend_url", "https://pairly-60qj.onrender.com")
            
            val url = URL("$backendUrl/moments/latest")
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.setRequestProperty("Authorization", "Bearer $authToken")
            connection.connectTimeout = 5000
            connection.readTimeout = 5000
            
            if (connection.responseCode == 200) {
                val response = connection.inputStream.bufferedReader().readText()
                val json = JSONObject(response)
                
                if (json.getBoolean("success")) {
                    val data = json.getJSONObject("data")
                    return@withContext MomentData(
                        photoBase64 = data.getString("photo"),
                        partnerName = data.getString("partnerName"),
                        sentAt = data.getString("sentAt")
                    )
                }
            }
            return@withContext null
        } catch (e: Exception) {
            Log.e(TAG, "Fetch failed", e)
            return@withContext null
        }
    }
    
    /**
     * Decode base64 to bitmap
     */
    private fun decodeBase64ToBitmap(base64: String): Bitmap? {
        return try {
            val decodedBytes = Base64.decode(base64, Base64.DEFAULT)
            BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
        } catch (e: Exception) {
            null
        }
    }
    
    /**
     * Get time ago string
     */
    private fun getTimeAgo(sentAt: String): String {
        return try {
            val sentTime = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US)
                .parse(sentAt)?.time ?: return "Now"
            
            val diff = System.currentTimeMillis() - sentTime
            val minutes = diff / 60000
            val hours = diff / 3600000
            
            when {
                minutes < 1 -> "Now"
                minutes < 60 -> "${minutes}m"
                hours < 24 -> "${hours}h"
                else -> "1d+"
            }
        } catch (e: Exception) {
            "Now"
        }
    }
    
    /**
     * Schedule periodic refresh
     */
    private fun scheduleRefresh(context: Context) {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, SimpleWidgetProvider::class.java).apply {
                action = ACTION_REFRESH
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            alarmManager.setRepeating(
                AlarmManager.ELAPSED_REALTIME,
                SystemClock.elapsedRealtime() + REFRESH_INTERVAL,
                REFRESH_INTERVAL,
                pendingIntent
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule refresh", e)
        }
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        if (intent.action == ACTION_REFRESH) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(
                ComponentName(context, SimpleWidgetProvider::class.java)
            )
            onUpdate(context, appWidgetManager, appWidgetIds)
        }
    }
    
    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        scheduleRefresh(context)
    }
    
    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, SimpleWidgetProvider::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.cancel(pendingIntent)
    }
    
    data class MomentData(
        val photoBase64: String,
        val partnerName: String,
        val sentAt: String
    )
}