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
 * 🎯 SIMPLE MVP Widget Provider
 * Polls backend every 10 seconds for latest moment
 * NO dependency on React Native state
 */
class PremiumCarouselWidgetProvider : AppWidgetProvider() {
    
    companion object {
        private const val TAG = "PairlyWidget"
        private const val ACTION_REFRESH = "com.pairly.WIDGET_REFRESH"
        private const val REFRESH_INTERVAL = 10_000L // 10 seconds
        
        /**
         * Schedule periodic widget refresh
         */
        fun schedulePeriodicRefresh(context: Context) {
            try {
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val intent = Intent(context, PremiumCarouselWidgetProvider::class.java).apply {
                    action = ACTION_REFRESH
                }
                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    0,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                
                // Cancel existing alarm
                alarmManager.cancel(pendingIntent)
                
                // Schedule new repeating alarm
                alarmManager.setRepeating(
                    AlarmManager.ELAPSED_REALTIME,
                    SystemClock.elapsedRealtime() + REFRESH_INTERVAL,
                    REFRESH_INTERVAL,
                    pendingIntent
                )
                
                Log.d(TAG, "✅ Periodic refresh scheduled (every ${REFRESH_INTERVAL / 1000}s)")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to schedule refresh", e)
            }
        }
        
        /**
         * Cancel periodic refresh
         */
        fun cancelPeriodicRefresh(context: Context) {
            try {
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val intent = Intent(context, PremiumCarouselWidgetProvider::class.java).apply {
                    action = ACTION_REFRESH
                }
                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    0,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                
                alarmManager.cancel(pendingIntent)
                Log.d(TAG, "✅ Periodic refresh cancelled")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to cancel refresh", e)
            }
        }
        
        /**
         * Fetch latest moment from backend
         */
        suspend fun fetchLatestMoment(context: Context): MomentData? = withContext(Dispatchers.IO) {
            try {
                val prefs = context.getSharedPreferences("PairlyPrefs", Context.MODE_PRIVATE)
                val authToken = prefs.getString("auth_token", null)
                val backendUrl = prefs.getString("backend_url", "https://pairly-backend.onrender.com")
                
                if (authToken == null) {
                    Log.w(TAG, "⚠️ [WIDGET] No auth token - user not logged in")
                    return@withContext null
                }
                
                Log.d(TAG, "📡 [WIDGET] Fetching latest moment from: $backendUrl/moments/latest")
                Log.d(TAG, "🔑 [WIDGET] Using auth token: ${authToken.substring(0, 10)}...")
                
                val url = URL("$backendUrl/moments/latest")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("Authorization", "Bearer $authToken")
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("User-Agent", "PairlyWidget/1.0 (Android)")
                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                
                val responseCode = connection.responseCode
                Log.d(TAG, "📥 [WIDGET] Backend response code: $responseCode")
                
                if (responseCode != 200) {
                    val errorBody = try {
                        connection.errorStream?.bufferedReader()?.readText() ?: "No error body"
                    } catch (e: Exception) {
                        "Could not read error body"
                    }
                    Log.w(TAG, "⚠️ [WIDGET] Backend returned $responseCode: $errorBody")
                    return@withContext null
                }
                
                val response = connection.inputStream.bufferedReader().readText()
                Log.d(TAG, "📦 [WIDGET] Response size: ${response.length} bytes")
                
                val json = JSONObject(response)
                
                if (!json.getBoolean("success")) {
                    val error = json.optString("error", "Unknown error")
                    Log.w(TAG, "⚠️ [WIDGET] Backend returned success=false: $error")
                    return@withContext null
                }
                
                val data = json.getJSONObject("data")
                val photoBase64 = data.getString("photo")
                val partnerName = data.getString("partnerName")
                val sentAt = data.getString("sentAt")
                
                val photoSizeKB = (photoBase64.length / 1024.0).toInt()
                Log.d(TAG, "✅ [WIDGET] Moment fetched successfully:")
                Log.d(TAG, "   👤 Partner: $partnerName")
                Log.d(TAG, "   📏 Photo size: $photoSizeKB KB")
                Log.d(TAG, "   ⏰ Sent at: $sentAt")
                
                return@withContext MomentData(
                    photoBase64 = photoBase64,
                    partnerName = partnerName,
                    sentAt = sentAt
                )
                
            } catch (e: Exception) {
                Log.e(TAG, "❌ [WIDGET] Failed to fetch moment: ${e.message}", e)
                return@withContext null
            }
        }
        
        /**
         * Decode base64 to bitmap (optimized)
         */
        fun decodeBase64ToBitmap(base64: String): Bitmap? {
            return try {
                val decodedBytes = Base64.decode(base64, Base64.DEFAULT)
                
                // First decode with inJustDecodeBounds to check dimensions
                val options = BitmapFactory.Options().apply {
                    inJustDecodeBounds = true
                }
                BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size, options)
                
                // Calculate inSampleSize
                options.inSampleSize = calculateInSampleSize(options, 400, 400)
                
                // Decode with inSampleSize set
                options.inJustDecodeBounds = false
                options.inPreferredConfig = Bitmap.Config.RGB_565 // 50% less memory
                
                BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size, options)
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to decode bitmap", e)
                null
            }
        }
        
        private fun calculateInSampleSize(options: BitmapFactory.Options, reqWidth: Int, reqHeight: Int): Int {
            val (height: Int, width: Int) = options.run { outHeight to outWidth }
            var inSampleSize = 1
            
            if (height > reqHeight || width > reqWidth) {
                val halfHeight: Int = height / 2
                val halfWidth: Int = width / 2
                
                while (halfHeight / inSampleSize >= reqHeight && halfWidth / inSampleSize >= reqWidth) {
                    inSampleSize *= 2
                }
            }
            return inSampleSize
        }
    }
    
    /**
     * Data class for moment
     */
    data class MomentData(
        val photoBase64: String,
        val partnerName: String,
        val sentAt: String
    )
    
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        Log.d(TAG, "🔄 [WIDGET] onUpdate called for ${appWidgetIds.size} widget(s)")
        
        try {
            // Fetch latest moment and update all widgets
            GlobalScope.launch {
                try {
                    Log.d(TAG, "🚀 [WIDGET] Starting fetch in coroutine...")
                    val moment = fetchLatestMoment(context)
                    
                    if (moment != null) {
                        Log.d(TAG, "✅ [WIDGET] Moment fetched, updating ${appWidgetIds.size} widget(s)")
                    } else {
                        Log.d(TAG, "📭 [WIDGET] No moment available, showing placeholder")
                    }
                    
                    for (appWidgetId in appWidgetIds) {
                        updateWidget(context, appWidgetManager, appWidgetId, moment)
                    }
                    
                    Log.d(TAG, "✅ [WIDGET] All widgets updated")
                } catch (e: Exception) {
                    Log.e(TAG, "❌ [WIDGET] Error in coroutine", e)
                    // Fallback: show placeholder for all widgets
                    for (appWidgetId in appWidgetIds) {
                        updateWidget(context, appWidgetManager, appWidgetId, null)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ [WIDGET] Critical error in onUpdate", e)
            // Emergency fallback: basic widget update
            for (appWidgetId in appWidgetIds) {
                try {
                    val views = RemoteViews(context.packageName, R.layout.widget_premium_carousel)
                    views.setImageViewResource(R.id.widget_image, R.drawable.widget_placeholder)
                    views.setTextViewText(R.id.widget_partner_name, "Pairly")
                    views.setTextViewText(R.id.widget_timestamp, "Tap to open app")
                    appWidgetManager.updateAppWidget(appWidgetId, views)
                } catch (fallbackError: Exception) {
                    Log.e(TAG, "❌ [WIDGET] Even fallback failed", fallbackError)
                }
            }
        }
    }
    
    /**
     * Update single widget
     */
    private fun updateWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        moment: MomentData?
    ) {
        try {
            Log.d(TAG, "🎨 [WIDGET] Updating widget ID: $appWidgetId")
            val views = RemoteViews(context.packageName, R.layout.widget_premium_carousel)
            
            if (moment != null) {
                Log.d(TAG, "📸 [WIDGET] Decoding photo for widget...")
                // Decode and display photo
                val bitmap = decodeBase64ToBitmap(moment.photoBase64)
                
                if (bitmap != null) {
                    showPhoto(views, bitmap, moment)
                    Log.d(TAG, "✅ [WIDGET] Widget $appWidgetId updated with photo from ${moment.partnerName}")
                } else {
                    // Failed to decode - show placeholder
                    showPlaceholder(views)
                    Log.w(TAG, "⚠️ [WIDGET] Failed to decode photo - showing placeholder")
                }
            } else {
                // No moment - show placeholder
                showPlaceholder(views)
                Log.d(TAG, "📭 [WIDGET] No moment available - showing glassmorphism placeholder")
            }
            
            // Set click to open app
            val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                val pendingIntent = PendingIntent.getActivity(
                    context,
                    appWidgetId,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
            }
            
            // Update widget
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(TAG, "✅ [WIDGET] Widget $appWidgetId UI updated successfully")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ [WIDGET] Error updating widget $appWidgetId: ${e.message}", e)
        }
    }
    
    /**
     * Show placeholder state with beautiful gradient design
     */
    private fun showPlaceholder(views: RemoteViews) {
        try {
            // Show gradient background and placeholder content
            views.setViewVisibility(R.id.widget_gradient_bg, android.view.View.VISIBLE)
            views.setViewVisibility(R.id.widget_placeholder_content, android.view.View.VISIBLE)
            views.setViewVisibility(R.id.widget_bottom_panel, android.view.View.GONE)
            views.setImageViewResource(R.id.widget_image, R.drawable.transparent)
            
            Log.d(TAG, "✨ [WIDGET] Showing beautiful placeholder design")
        } catch (e: Exception) {
            Log.e(TAG, "❌ [WIDGET] Error showing placeholder", e)
            // Fallback to basic placeholder
            views.setImageViewResource(R.id.widget_image, R.drawable.widget_placeholder)
            views.setTextViewText(R.id.widget_partner_name, "Pairly")
            views.setTextViewText(R.id.widget_timestamp, "Tap to open app")
            views.setViewVisibility(R.id.widget_bottom_panel, android.view.View.VISIBLE)
        }
    }
    
    /**
     * Show photo state
     */
    private fun showPhoto(views: RemoteViews, bitmap: Bitmap, moment: MomentData) {
        try {
            // Show photo and hide placeholder
            views.setImageViewBitmap(R.id.widget_image, bitmap)
            views.setViewVisibility(R.id.widget_gradient_bg, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_placeholder_content, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_bottom_panel, android.view.View.VISIBLE)
            
            // Update text content
            views.setTextViewText(R.id.widget_partner_name, moment.partnerName)
            views.setTextViewText(R.id.widget_timestamp, getTimeAgo(moment.sentAt))
            
            Log.d(TAG, "📸 [WIDGET] Showing photo with overlay")
        } catch (e: Exception) {
            Log.e(TAG, "❌ [WIDGET] Error showing photo", e)
            // Fallback to basic display
            views.setImageViewBitmap(R.id.widget_image, bitmap)
            views.setTextViewText(R.id.widget_partner_name, moment.partnerName)
            views.setTextViewText(R.id.widget_timestamp, getTimeAgo(moment.sentAt))
            views.setViewVisibility(R.id.widget_bottom_panel, android.view.View.VISIBLE)
        }
    }
    
    /**
     * Get time ago string
     */
    private fun getTimeAgo(sentAt: String): String {
        return try {
            val sentTime = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US)
                .parse(sentAt)?.time ?: return "Just now"
            
            val now = System.currentTimeMillis()
            val diff = now - sentTime
            
            val minutes = diff / 60000
            val hours = diff / 3600000
            val days = diff / 86400000
            
            when {
                minutes < 1 -> "Just now"
                minutes < 60 -> "${minutes}m ago"
                hours < 24 -> "${hours}h ago"
                days < 7 -> "${days}d ago"
                else -> "A while ago"
            }
        } catch (e: Exception) {
            "Just now"
        }
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        if (intent.action == ACTION_REFRESH) {
            Log.d(TAG, "⏰ Periodic refresh triggered")
            
            // Update all widgets
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(
                ComponentName(context, PremiumCarouselWidgetProvider::class.java)
            )
            
            onUpdate(context, appWidgetManager, appWidgetIds)
        }
    }
    
    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.d(TAG, "✅ Widget enabled - starting periodic refresh")
        schedulePeriodicRefresh(context)
    }
    
    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        Log.d(TAG, "🛑 Widget disabled - stopping periodic refresh")
        cancelPeriodicRefresh(context)
    }
}
