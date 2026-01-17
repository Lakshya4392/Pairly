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
import android.widget.RemoteViews
import com.pairly.app.MainActivity
import com.pairly.app.R
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * Pairly Polaroid Widget - Premium Style
 * Features: Photo in polaroid frame, "Missing you" text, single reaction button
 * 🔥 WITH EXPIRY SUPPORT: Photos disappear after timer runs out
 */
class PairlyPolaroidWidget : AppWidgetProvider() {

    companion object {
        private const val API_URL = "https://pairly-60qj.onrender.com"
        const val ACTION_REFRESH = "com.pairly.app.widget.POLAROID_REFRESH"
        const val ACTION_EXPIRE = "com.pairly.app.widget.POLAROID_EXPIRE"
        private const val POLAROID_CACHE_FILENAME = "pairly_polaroid_photo_cache.png"
        private const val EXPIRY_DURATION_MS = 24 * 60 * 60 * 1000L // Default 24 hours
        private const val ALARM_REQUEST_CODE = 888 // Unique for Polaroid

        /**
         * Update all polaroid widgets
         */
        fun updateAllWidgets(context: Context) {
            try {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, PairlyPolaroidWidget::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

                val widget = PairlyPolaroidWidget()
                widget.onUpdate(context, appWidgetManager, appWidgetIds)
            } catch (e: Exception) {
                println("❌ [PolaroidWidget] Error updating: ${e.message}")
            }
        }

        /**
         * Update polaroid widget with photo
         * @param customExpiryTime Absolute timestamp (ms since epoch) when photo should expire. 0 = default 24h.
         */
        fun updateWithPhoto(context: Context, bitmap: Bitmap, momentId: String? = null, customExpiryTime: Long = 0) {
            try {
                println("📸 [PolaroidWidget] Updating with photo")

                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, PairlyPolaroidWidget::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

                if (appWidgetIds.isEmpty()) {
                    println("⚠️ [PolaroidWidget] No widgets on home screen")
                    return
                }

                // Save momentId for reactions
                val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                if (momentId != null) {
                    prefs.edit().putString("polaroid_moment_id", momentId).apply()
                }

                // Cancel old alarm, save bitmap with new expiry
                cancelExpiryAlarm(context)
                saveBitmapToCache(context, bitmap, customExpiryTime)

                for (appWidgetId in appWidgetIds) {
                    val views = RemoteViews(context.packageName, R.layout.pairly_widget_polaroid)

                    // Set photo
                    views.setImageViewBitmap(R.id.widget_image, bitmap)
                    
                    // Hide placeholder
                    views.setViewVisibility(R.id.widget_placeholder, android.view.View.GONE)
                    views.setViewVisibility(R.id.widget_image, android.view.View.VISIBLE)

                    // Click handler - Open app directly
                    val intent = Intent(context, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    val pendingIntent = PendingIntent.getActivity(
                        context, appWidgetId, intent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

                    // Setup single reaction button (opens picker)
                    setupReactionButton(context, views, appWidgetId)

                    appWidgetManager.updateAppWidget(appWidgetId, views)
                }

                println("✅ [PolaroidWidget] Updated successfully")
            } catch (e: Exception) {
                println("❌ [PolaroidWidget] Error: ${e.message}")
            }
        }

        /**
         * Save bitmap to cache with expiry
         */
        private fun saveBitmapToCache(context: Context, bitmap: Bitmap, customExpiryTime: Long) {
            try {
                val cacheFile = File(context.cacheDir, POLAROID_CACHE_FILENAME)
                FileOutputStream(cacheFile).use { out ->
                    bitmap.compress(Bitmap.CompressFormat.PNG, 90, out)
                }
                
                // Determine expiry time
                val expiryTime = if (customExpiryTime > 0) {
                    customExpiryTime
                } else {
                    System.currentTimeMillis() + EXPIRY_DURATION_MS
                }
                
                val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                prefs.edit().putLong("polaroid_expiry_time", expiryTime).apply()
                
                // Schedule Alarm
                scheduleExpiryAlarm(context, expiryTime)
                
                println("✅ [PolaroidWidget] Bitmap cached. Expires at: $expiryTime")
            } catch (e: Exception) {
                println("⚠️ [PolaroidWidget] Failed to cache bitmap: ${e.message}")
            }
        }

        /**
         * Load cached bitmap (checks expiry)
         */
        private fun loadCachedBitmap(context: Context): Bitmap? {
            return try {
                val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                val expiryTime = prefs.getLong("polaroid_expiry_time", 0)
                
                // Check if expired
                if (expiryTime > 0 && System.currentTimeMillis() >= expiryTime) {
                    println("🕒 [PolaroidWidget] Photo EXPIRED! Clearing...")
                    clearCache(context)
                    return null
                }
                
                val cacheFile = File(context.cacheDir, POLAROID_CACHE_FILENAME)
                if (cacheFile.exists()) {
                    BitmapFactory.decodeStream(FileInputStream(cacheFile))
                } else {
                    null
                }
            } catch (e: Exception) {
                println("⚠️ [PolaroidWidget] Failed to load cached bitmap: ${e.message}")
                null
            }
        }

        /**
         * Clear cache and prefs
         */
        private fun clearCache(context: Context) {
            try {
                val cacheFile = File(context.cacheDir, POLAROID_CACHE_FILENAME)
                if (cacheFile.exists()) {
                    cacheFile.delete()
                }
                val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                prefs.edit()
                    .remove("polaroid_expiry_time")
                    .remove("polaroid_moment_id")
                    .apply()
                println("🗑️ [PolaroidWidget] Cache cleared")
            } catch (e: Exception) {
                println("⚠️ [PolaroidWidget] Failed to clear cache: ${e.message}")
            }
        }

        /**
         * ⏰ Schedule Alarm to Auto-Clear Widget
         */
        private fun scheduleExpiryAlarm(context: Context, expiryTime: Long) {
            try {
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
                val intent = Intent(context, PairlyPolaroidWidget::class.java).apply {
                    action = ACTION_EXPIRE
                }
                val pendingIntent = PendingIntent.getBroadcast(
                    context, ALARM_REQUEST_CODE, intent, 
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
                println("⏰ [PolaroidWidget] Alarm Scheduled for: $expiryTime")
            } catch (e: Exception) {
                println("⚠️ [PolaroidWidget] Failed to schedule alarm: ${e.message}")
            }
        }

        /**
         * Cancel pending expiry alarm
         */
        private fun cancelExpiryAlarm(context: Context) {
            try {
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
                val intent = Intent(context, PairlyPolaroidWidget::class.java).apply {
                    action = ACTION_EXPIRE
                }
                val pendingIntent = PendingIntent.getBroadcast(
                    context, ALARM_REQUEST_CODE, intent, 
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                alarmManager.cancel(pendingIntent)
                println("🔕 [PolaroidWidget] Previous alarm cancelled")
            } catch (e: Exception) {
                println("⚠️ [PolaroidWidget] Failed to cancel alarm: ${e.message}")
            }
        }

        /**
         * Set up reaction button in bottom-right
         * Tap heart = Open reaction picker
         */
        private fun setupReactionButton(context: Context, views: RemoteViews, appWidgetId: Int) {
            try {
                val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                val momentId = prefs.getString("polaroid_moment_id", null) ?: return
                
                // Reaction button opens picker activity
                val intent = Intent(context, ReactionPickerActivity::class.java).apply {
                    putExtra(ReactionPickerActivity.EXTRA_MOMENT_ID, momentId)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                }
                
                val pendingIntent = PendingIntent.getActivity(
                    context,
                    appWidgetId + 2000, // Unique request code for polaroid widget
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                
                // Attach to react button (visible in bottom-right)
                views.setOnClickPendingIntent(R.id.react_button, pendingIntent)
                
                println("✅ [PolaroidWidget] Reaction button set up for moment: $momentId")
            } catch (e: Exception) {
                println("⚠️ [PolaroidWidget] Failed to set up reaction: ${e.message}")
            }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        when (intent.action) {
            ACTION_REFRESH -> {
                println("📱 [PolaroidWidget] Received refresh")
                updateAllWidgets(context)
            }
            ACTION_EXPIRE -> {
                println("⏰ [PolaroidWidget] Expiry Alarm Fired! Clearing widget...")
                clearCache(context)
                updateAllWidgets(context)
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            // 🔥 FIX: Try to show cached image FIRST (checks expiry)
            val cachedBitmap = loadCachedBitmap(context)
            if (cachedBitmap != null) {
                updateWidgetWithBitmap(context, appWidgetManager, appWidgetId, cachedBitmap)
                println("✅ [PolaroidWidget] Showing cached image")
            } else {
                updateWidgetWithDefault(context, appWidgetManager, appWidgetId)
            }
            
            // Fetch latest photo in background
            FetchPhotoTask(context, appWidgetManager, appWidgetId).execute()
        }
    }

    private fun updateWidgetWithDefault(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        try {
            val views = RemoteViews(context.packageName, R.layout.pairly_widget_polaroid)

            // Show placeholder
            views.setViewVisibility(R.id.widget_placeholder, android.view.View.VISIBLE)
            views.setViewVisibility(R.id.widget_image, android.view.View.GONE)

            // Click handler
            val intent = Intent(context, MainActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            val pendingIntent = PendingIntent.getActivity(
                context, appWidgetId, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

            // Setup reaction button
            setupReactionButton(context, views, appWidgetId)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        } catch (e: Exception) {
            println("❌ [PolaroidWidget] Default update error: ${e.message}")
        }
    }

    private fun updateWidgetWithBitmap(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, bitmap: Bitmap) {
        try {
            val views = RemoteViews(context.packageName, R.layout.pairly_widget_polaroid)

            views.setImageViewBitmap(R.id.widget_image, bitmap)
            views.setViewVisibility(R.id.widget_image, android.view.View.VISIBLE)
            views.setViewVisibility(R.id.widget_placeholder, android.view.View.GONE)

            // Click handler
            val intent = Intent(context, MainActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            val pendingIntent = PendingIntent.getActivity(
                context, appWidgetId, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

            // Setup reaction button
            setupReactionButton(context, views, appWidgetId)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        } catch (e: Exception) {
            println("❌ [PolaroidWidget] Bitmap update error: ${e.message}")
        }
    }

    /**
     * Background task to fetch latest photo
     */
    private inner class FetchPhotoTask(
        private val context: Context,
        private val appWidgetManager: AppWidgetManager,
        private val appWidgetId: Int
    ) : AsyncTask<Void, Void, Bitmap?>() {

        private var fetchedMomentId: String? = null
        private var fetchedExpiryTime: Long = 0

        override fun doInBackground(vararg params: Void?): Bitmap? {
            try {
                val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                val userId = prefs.getString("user_id", null) ?: return null
                val token = prefs.getString("auth_token", null) ?: return null

                val url = URL("$API_URL/moments/latest?userId=$userId")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("Authorization", "Bearer $token")
                connection.connectTimeout = 10000
                connection.readTimeout = 10000

                if (connection.responseCode != 200) {
                    return null
                }

                val response = connection.inputStream.bufferedReader().readText()
                connection.disconnect()

                // Parse photo URL from response
                val photoUrlMatch = Regex("\"photoData\":\"(https://[^\"]+)\"").find(response)
                val momentIdMatch = Regex("\"id\":\"([^\"]+)\"").find(response)
                val expiresAtMatch = Regex("\"expiresAt\":\"([^\"]+)\"").find(response)

                val photoUrl = photoUrlMatch?.groupValues?.get(1) ?: return null
                fetchedMomentId = momentIdMatch?.groupValues?.get(1)
                
                // Parse expiresAt timestamp
                expiresAtMatch?.groupValues?.get(1)?.let { expiresAtStr ->
                    try {
                        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US)
                        fetchedExpiryTime = sdf.parse(expiresAtStr)?.time ?: 0
                    } catch (e: Exception) {
                        // Keep default 0
                    }
                }

                // Download and scale image
                return downloadAndScaleBitmap(photoUrl)
            } catch (e: Exception) {
                println("❌ [PolaroidWidget] Fetch error: ${e.message}")
                return null
            }
        }

        private fun downloadAndScaleBitmap(photoUrl: String): Bitmap? {
            return try {
                val url = URL(photoUrl)
                val connection = url.openConnection() as HttpURLConnection
                connection.connectTimeout = 10000
                connection.readTimeout = 10000

                val inputStream = connection.inputStream
                val options = BitmapFactory.Options().apply {
                    inSampleSize = 2 // Scale down for memory
                }
                val bitmap = BitmapFactory.decodeStream(inputStream, null, options)
                connection.disconnect()

                // Scale to widget size
                bitmap?.let {
                    val maxSize = 400
                    val ratio = minOf(maxSize.toFloat() / it.width, maxSize.toFloat() / it.height)
                    Bitmap.createScaledBitmap(
                        it,
                        (it.width * ratio).toInt(),
                        (it.height * ratio).toInt(),
                        true
                    )
                }
            } catch (e: Exception) {
                null
            }
        }

        override fun onPostExecute(bitmap: Bitmap?) {
            if (bitmap != null) {
                // Use the static updateWithPhoto to save with expiry
                updateWithPhoto(context, bitmap, fetchedMomentId, fetchedExpiryTime)
            }
        }
    }
}

