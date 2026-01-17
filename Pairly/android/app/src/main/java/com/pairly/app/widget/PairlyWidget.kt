package com.pairly.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.AsyncTask
import android.util.Base64
import android.widget.RemoteViews
import com.pairly.app.MainActivity
import com.pairly.app.R
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * Premium Pairly Widget with image support
 * 🔥 FIXED: No flickering - shows cached image immediately
 */
class PairlyWidget : AppWidgetProvider() {

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        // Handle custom refresh action (from FCM or manual trigger)
        if (intent.action == ACTION_REFRESH) {
            println("📱 [Widget] Received refresh broadcast")
            updateAllWidgets(context)
        } else if (intent.action == ACTION_EXPIRE) {
             println("⏰ [Widget] Expiry Alarm Fired! Clearing widget...")
             // This will trigger onUpdate, which calls loadCachedBitmap -> checks time -> deletes cache
             updateAllWidgets(context)
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            // 🔥 FIX: Try to show cached image FIRST (no flickering)
            val cachedBitmap = loadCachedBitmap(context)
            if (cachedBitmap != null) {
                // Show cached image immediately
                updateWidgetWithBitmap(context, appWidgetManager, appWidgetId, cachedBitmap)
                println("✅ [Widget] Showing cached image (no flicker)")
            } else {
                // Only show default if no cache exists
                updateWidgetWithDefault(context, appWidgetManager, appWidgetId)
            }
            
            // Fetch latest photo in background (will update if different)
            FetchPhotoTask(context, appWidgetManager, appWidgetId).execute()
        }
    }

    private fun updateWidgetWithDefault(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        try {
            val views = RemoteViews(context.packageName, R.layout.pairly_widget_simple)
            val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
            
            // Try to get partner name from prefs
            val partnerName = prefs.getString("partner_name", null)
            
            if (partnerName != null && partnerName.isNotEmpty()) {
                // Show partner name with waiting message
                views.setTextViewText(R.id.widget_sender_name, "$partnerName 💕")
                views.setTextViewText(R.id.widget_timestamp, "Waiting for moment...")
            } else {
                // No partner - show default
                views.setTextViewText(R.id.widget_sender_name, "Pairly")
                views.setTextViewText(R.id.widget_timestamp, "Tap to share")
            }
            views.setImageViewResource(R.id.widget_image, R.drawable.widget_placeholder)
            
            // Click handler - Open app directly
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context, appWidgetId, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)
            
            appWidgetManager.updateAppWidget(appWidgetId, views)
        } catch (e: Exception) {
            // Silent fail
        }
    }

    private fun updateWidgetWithBitmap(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, bitmap: Bitmap) {
        try {
            val views = RemoteViews(context.packageName, R.layout.pairly_widget_simple)
            val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
            
            // Check expiry again just in case
            val expiryTime = prefs.getLong("photo_expiry_time", 0)
            if (expiryTime > 0 && System.currentTimeMillis() > expiryTime) {
                // Expired! Show default
                updateWidgetWithDefault(context, appWidgetManager, appWidgetId)
                return
            }

            // Get sender name - fallback to saved partner name if not available
            val partnerName = prefs.getString("partner_name", "Partner") ?: "Partner"
            val senderName = prefs.getString("last_sender_name", partnerName) ?: partnerName
            
            views.setImageViewBitmap(R.id.widget_image, bitmap)
            views.setTextViewText(R.id.widget_sender_name, "$senderName 💝")
            views.setTextViewText(R.id.widget_timestamp, "Tap to view")
            
            // Click handler - Open app directly
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context, appWidgetId, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)
            
            // Set up reaction button
            setupReactionButtons(context, views, appWidgetId)
            
            appWidgetManager.updateAppWidget(appWidgetId, views)
        } catch (e: Exception) {
            println("❌ [Widget] updateWidgetWithBitmap error: ${e.message}")
        }
    }

    companion object {
        private const val API_URL = "https://pairly-60qj.onrender.com"
        const val ACTION_REFRESH = "com.pairly.app.widget.ACTION_REFRESH"
        const val ACTION_EXPIRE = "com.pairly.app.widget.ACTION_EXPIRE"
        private const val CACHE_FILENAME = "widget_cached_photo.png"
        private const val EXPIRY_DURATION_MS = 24 * 60 * 60 * 1000L // 24 Hours
        
        /**
         * 🔥 Load cached bitmap from disk (Checks Expiry)
         */
        fun loadCachedBitmap(context: Context): Bitmap? {
            return try {
                val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                val expiryTime = prefs.getLong("photo_expiry_time", 0)
                
                // 🕒 EXPIRY CHECK
                if (expiryTime > 0 && System.currentTimeMillis() > expiryTime) {
                    println("🕒 [Widget] Photo EXPIRED! Deleting cache. Now: ${System.currentTimeMillis()}, Exp: $expiryTime")
                    val cacheFile = File(context.cacheDir, CACHE_FILENAME)
                    if (cacheFile.exists()) {
                        cacheFile.delete()
                    }
                    // Clear prefs
                    prefs.edit()
                        .remove("photo_expiry_time")
                        .remove("last_sender_name")
                        .apply()
                    return null
                }

                val cacheFile = File(context.cacheDir, CACHE_FILENAME)
                if (cacheFile.exists()) {
                    BitmapFactory.decodeStream(FileInputStream(cacheFile))
                } else {
                    null
                }
            } catch (e: Exception) {
                println("⚠️ [Widget] Failed to load cached bitmap: ${e.message}")
                null
            }
        }
        
        /**
         * 🔥 Save bitmap to disk cache (Sets Expiry)
         */
        fun saveBitmapToCache(context: Context, bitmap: Bitmap) {
            try {
                val cacheFile = File(context.cacheDir, CACHE_FILENAME)
                FileOutputStream(cacheFile).use { out ->
                    bitmap.compress(Bitmap.CompressFormat.PNG, 90, out)
                }
                
                // Set expiry to 24 hours from now
                val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                val expiryTime = System.currentTimeMillis() + EXPIRY_DURATION_MS
                prefs.edit().putLong("photo_expiry_time", expiryTime).apply()
                
                // Schedule Alarm
                scheduleExpiryAlarm(context, expiryTime)
                
                println("✅ [Widget] Bitmap cached to disk. Expires in 24h.")
            } catch (e: Exception) {
                println("⚠️ [Widget] Failed to cache bitmap: ${e.message}")
            }
        }
        
        /**
         * ⏰ Schedule Alarm to Auto-Clear Widget
         */
        private fun scheduleExpiryAlarm(context: Context, expiryTime: Long) {
            try {
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
                val intent = Intent(context, PairlyWidget::class.java).apply {
                    action = ACTION_EXPIRE
                }
                val pendingIntent = PendingIntent.getBroadcast(
                    context, 777, intent, 
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                
                // Remove any prev alarm
                alarmManager.cancel(pendingIntent)
                
                // Set new alarm
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(android.app.AlarmManager.RTC, expiryTime, pendingIntent)
                } else {
                    alarmManager.setExact(android.app.AlarmManager.RTC, expiryTime, pendingIntent)
                }
                println("⏰ [Widget] Alarm Scheduled for: $expiryTime")
            } catch (e: Exception) {
                println("⚠️ [Widget] Failed to schedule alarm: ${e.message}")
            }
        }
        
        /**
         * Static helper to refresh all widgets from JS
         */
        fun updateAllWidgets(context: Context) {
            try {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, PairlyWidget::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
                
                // Trigger onUpdate for all widgets
                val widget = PairlyWidget()
                widget.onUpdate(context, appWidgetManager, appWidgetIds)
            } catch (e: Exception) {
                // Silent fail
            }
        }
        
        /**
         * Update all widgets with a specific photo bitmap.
         * Called by PairlyMessagingService when FCM message received in background.
         * This enables instant widget updates even when app is killed.
         */
        fun updateWithPhoto(context: Context, bitmap: Bitmap, senderName: String, momentId: String? = null, customExpiryTime: Long = 0) {
            try {
                println("📱 [Widget] Updating with photo from: $senderName")
                
                // 🔥 Save to cache FIRST (Sets new Expiry)
                try {
                    val cacheFile = File(context.cacheDir, CACHE_FILENAME)
                    FileOutputStream(cacheFile).use { out ->
                        bitmap.compress(Bitmap.CompressFormat.PNG, 90, out)
                    }
                    
                    // Set Expiry: Use custom if provided, else Default 24h
                    val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                    val finalExpiry = if (customExpiryTime > 0) {
                        customExpiryTime 
                    } else {
                        System.currentTimeMillis() + EXPIRY_DURATION_MS
                    }
                    
                    prefs.edit().putLong("photo_expiry_time", finalExpiry).apply()
                    
                    // ⏰ Schedule Alarm for THIS expiry
                    scheduleExpiryAlarm(context, finalExpiry)
                    
                    println("✅ [Widget] Bitmap cached. Expires at: $finalExpiry (Custom: ${customExpiryTime > 0})")
                } catch (e: Exception) {
                    println("⚠️ [Widget] Failed to cache bitmap: ${e.message}")
                }
                
                // Save sender name for cached display
                val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                prefs.edit()
                    .putString("last_sender_name", senderName)
                    .apply()
                
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, PairlyWidget::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
                
                if (appWidgetIds.isEmpty()) {
                    println("⚠️ [Widget] No widgets on home screen")
                    return
                }
                
                // Save momentId for reactions
                if (momentId != null) {
                    prefs.edit().putString("current_moment_id", momentId).apply()
                }
                
                for (appWidgetId in appWidgetIds) {
                    val views = RemoteViews(context.packageName, R.layout.pairly_widget_simple)
                    
                    // Set photo
                    views.setImageViewBitmap(R.id.widget_image, bitmap)
                    views.setTextViewText(R.id.widget_sender_name, "$senderName 💝")
                    views.setTextViewText(R.id.widget_timestamp, "Just now")
                    
                    // Click handler for main widget
                    val intent = Intent(context, MainActivity::class.java)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    val pendingIntent = PendingIntent.getActivity(
                        context, appWidgetId, intent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)
                    
                    // Set up reaction buttons
                    setupReactionButtons(context, views, appWidgetId)
                    
                    appWidgetManager.updateAppWidget(appWidgetId, views)
                }
                
                println("✅ [Widget] Updated ${appWidgetIds.size} widgets with new photo")
            } catch (e: Exception) {
                println("❌ [Widget] updateWithPhoto error: ${e.message}")
            }
        }
        
        /**
         * Set up reaction button in bottom-right
         * Tap heart = Open reaction picker
         */
        private fun setupReactionButtons(context: Context, views: RemoteViews, appWidgetId: Int) {
            try {
                val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                val momentId = prefs.getString("current_moment_id", null) ?: return
                
                // Reaction button opens picker activity
                val intent = Intent(context, ReactionPickerActivity::class.java).apply {
                    putExtra(ReactionPickerActivity.EXTRA_MOMENT_ID, momentId)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                }
                
                val pendingIntent = PendingIntent.getActivity(
                    context,
                    appWidgetId + 1000, // Unique request code for reaction
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                
                // Attach to react button (visible in bottom-right)
                views.setOnClickPendingIntent(R.id.react_button, pendingIntent)
                
                println("✅ [Widget] Reaction button set up for moment: $momentId")
            } catch (e: Exception) {
                println("⚠️ [Widget] Failed to set up reaction: ${e.message}")
            }
        }
    }

    /**
     * Background task to fetch partner's latest photo
     * 🔥 FIXED: Also saves to cache for next time
     */
    private class FetchPhotoTask(
        private val context: Context,
        private val appWidgetManager: AppWidgetManager,
        private val appWidgetId: Int
    ) : AsyncTask<Void, Void, Bitmap?>() {

        // Initialize senderName from saved partner_name
        private var senderName: String = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
            .getString("partner_name", "Partner") ?: "Partner"
        private var momentId: String? = null

        override fun doInBackground(vararg params: Void?): Bitmap? {
            try {
                val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                val authToken = prefs.getString("auth_token", null) ?: return null
                val userId = prefs.getString("user_id", null) ?: return null
                
                // Use hardcoded URL if not in prefs, but respect prepended constants if needed
                // The companion API_URL should be used
                val url = URL("$API_URL/moments/latest?userId=$userId")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("Authorization", "Bearer $authToken")
                connection.connectTimeout = 15000
                connection.readTimeout = 15000

                if (connection.responseCode == 200) {
                    val response = connection.inputStream.bufferedReader().readText()
                    
                    // Extract sender name
                    val senderMatch = Regex("\"uploaderName\":\"([^\"]+)\"").find(response)
                    if (senderMatch != null) {
                        senderName = senderMatch.groupValues[1]
                    }
                    
                    // Extract moment ID
                    val idMatch = Regex("\"id\":\"([^\"]+)\"").find(response)
                    if (idMatch != null) {
                        momentId = idMatch.groupValues[1]
                    }
                    
                    // Try to parse "photoData" (URL) first which is used for Cloudinary
                    val photoUrlMatch = Regex("\"photoData\":\"(https://[^\"]+)\"").find(response)
                    if (photoUrlMatch != null) {
                       val photoUrl = photoUrlMatch.groupValues[1]
                       return downloadAndScaleBitmap(photoUrl)
                    }

                    // Fallback to "photo" (Base64) for legacy support
                    val photoRegex = "\"photo\"\\s*:\\s*\"([^\"]+)\"".toRegex()
                    val match = photoRegex.find(response)
                    if (match != null) {
                        val base64Photo = match.groupValues[1]
                        val cleanBase64 = base64Photo.replace("data:image/[^;]+;base64,".toRegex(), "")
                        val imageBytes = Base64.decode(cleanBase64, Base64.DEFAULT)
                        return BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                    }
                }
                connection.disconnect()
            } catch (e: Exception) {
                println("⚠️ [Widget] FetchPhotoTask error: ${e.message}")
            }
            return null
        }

        private fun downloadAndScaleBitmap(photoUrl: String): Bitmap? {
            return try {
                val url = URL(photoUrl)
                val connection = url.openConnection() as HttpURLConnection
                connection.connectTimeout = 15000
                connection.readTimeout = 15000
                
                val bitmap = BitmapFactory.decodeStream(connection.inputStream)
                connection.disconnect()
                
                // Scale if needed (Simple widget usually handles full size well, but safe to limit)
                if (bitmap != null && (bitmap.width > 800 || bitmap.height > 800)) {
                     val ratio = 800f / maxOf(bitmap.width, bitmap.height)
                     return Bitmap.createScaledBitmap(bitmap, (bitmap.width * ratio).toInt(), (bitmap.height * ratio).toInt(), true)
                }
                return bitmap
            } catch (e: Exception) {
                println("⚠️ [Widget] downloadAndScaleBitmap error: ${e.message}")
                null
            }
        }


        override fun onPostExecute(bitmap: Bitmap?) {
            if (bitmap != null) {
                try {
                    // 🔥 Save to cache for next time (Sets Expiry)
                    saveBitmapToCache(context, bitmap)
                    
                    // Save sender name
                    val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                    prefs.edit()
                        .putString("last_sender_name", senderName)
                        .apply()
                    
                    // Save moment ID
                    if (momentId != null) {
                        prefs.edit().putString("current_moment_id", momentId).apply()
                    }
                    
                    val views = RemoteViews(context.packageName, R.layout.pairly_widget_simple)
                    
                    // Use current layout IDs
                    views.setTextViewText(R.id.widget_sender_name, "$senderName 💝")
                    views.setTextViewText(R.id.widget_timestamp, "Just now")
                    views.setImageViewBitmap(R.id.widget_image, bitmap)
                    
                    // Click handler for main widget
                    val intent = Intent(context, MainActivity::class.java)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    val pendingIntent = PendingIntent.getActivity(
                        context, appWidgetId, intent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)
                    
                    // Set up reaction button
                    try {
                        if (momentId != null) {
                            val reactIntent = Intent(context, ReactionPickerActivity::class.java).apply {
                                putExtra(ReactionPickerActivity.EXTRA_MOMENT_ID, momentId)
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                            }
                            val reactPendingIntent = PendingIntent.getActivity(
                                context,
                                appWidgetId + 1000,
                                reactIntent,
                                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                            )
                            views.setOnClickPendingIntent(R.id.react_button, reactPendingIntent)
                            println("✅ [Widget] Reaction button set up in onPostExecute")
                        }
                    } catch (e: Exception) {
                        println("⚠️ [Widget] Reaction button setup failed: ${e.message}")
                    }
                    
                    appWidgetManager.updateAppWidget(appWidgetId, views)
                    println("✅ [Widget] Updated with fresh photo from backend")
                } catch (e: Exception) {
                    println("❌ [Widget] onPostExecute error: ${e.message}")
                }
            }
        }
    }
}
