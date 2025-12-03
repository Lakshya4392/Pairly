package com.pairly.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.widget.RemoteViews
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

/**
 * 🎨 Premium Carousel Widget Provider
 * iOS-style widget with smooth carousel effect
 */
class PremiumCarouselWidgetProvider : AppWidgetProvider() {
    
    companion object {
        private const val ACTION_NEXT_PHOTO = "com.pairly.NEXT_PHOTO"
        private const val ACTION_PREV_PHOTO = "com.pairly.PREV_PHOTO"
        private const val ACTION_OPEN_APP = "com.pairly.OPEN_APP"
        private const val PREFS_NAME = "PremiumWidgetPrefs"
        private const val PREF_CURRENT_INDEX = "current_photo_index"
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        var currentIndex = prefs.getInt(PREF_CURRENT_INDEX, 0)
        
        when (intent.action) {
            ACTION_NEXT_PHOTO -> {
                val photoList = loadPhotoList(context)
                if (photoList.isNotEmpty()) {
                    currentIndex = (currentIndex + 1) % photoList.size
                    prefs.edit().putInt(PREF_CURRENT_INDEX, currentIndex).apply()
                    updateAllWidgets(context)
                }
            }
            ACTION_PREV_PHOTO -> {
                val photoList = loadPhotoList(context)
                if (photoList.isNotEmpty()) {
                    currentIndex = if (currentIndex == 0) {
                        photoList.size - 1
                    } else {
                        currentIndex - 1
                    }
                    prefs.edit().putInt(PREF_CURRENT_INDEX, currentIndex).apply()
                    updateAllWidgets(context)
                }
            }
            ACTION_OPEN_APP -> {
                // Open app
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                launchIntent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(launchIntent)
            }
        }
    }

    private fun updateWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        try {
            val views = RemoteViews(context.packageName, R.layout.widget_premium_carousel)
            
            // Load photos from storage
            val photoList = loadPhotoList(context)
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val currentIndex = prefs.getInt(PREF_CURRENT_INDEX, 0)
            
            if (photoList.isEmpty()) {
                // Show empty state
                views.setViewVisibility(R.id.photo_carousel, android.view.View.GONE)
                views.setViewVisibility(R.id.widget_placeholder, android.view.View.VISIBLE)
                views.setViewVisibility(R.id.dot_indicators, android.view.View.GONE)
            } else {
                // Show carousel
                views.setViewVisibility(R.id.photo_carousel, android.view.View.VISIBLE)
                views.setViewVisibility(R.id.widget_placeholder, android.view.View.GONE)
                
                // Load current photo
                val validIndex = currentIndex.coerceIn(0, photoList.size - 1)
                val photoPath = photoList[validIndex]
                val bitmap = loadBitmap(photoPath)
                
                if (bitmap != null) {
                    // Set photo to current slot
                    when (validIndex % 3) {
                        0 -> views.setImageViewBitmap(R.id.widget_image_1, bitmap)
                        1 -> views.setImageViewBitmap(R.id.widget_image_2, bitmap)
                        2 -> views.setImageViewBitmap(R.id.widget_image_3, bitmap)
                    }
                    
                    // Update ViewFlipper to show current photo
                    views.setDisplayedChild(R.id.photo_carousel, validIndex % 3)
                    
                    // Update dot indicators
                    updateDotIndicators(views, validIndex, photoList.size)
                    
                    // Set partner name
                    val partnerName = getPartnerName(context)
                    views.setTextViewText(R.id.widget_partner_name, partnerName)
                    
                    // Set timestamp
                    val timeAgo = getTimeAgo(photoPath)
                    views.setTextViewText(R.id.widget_timestamp, timeAgo)
                } else {
                    // Bitmap failed to load, show empty state
                    views.setViewVisibility(R.id.photo_carousel, android.view.View.GONE)
                    views.setViewVisibility(R.id.widget_placeholder, android.view.View.VISIBLE)
                    views.setViewVisibility(R.id.dot_indicators, android.view.View.GONE)
                }
            }
            
            // Setup click listeners
            setupClickListeners(context, views, appWidgetId)
            
            // Update widget
            appWidgetManager.updateAppWidget(appWidgetId, views)
        } catch (e: Exception) {
            // If anything fails, show empty state gracefully
            try {
                val views = RemoteViews(context.packageName, R.layout.widget_premium_carousel)
                views.setViewVisibility(R.id.photo_carousel, android.view.View.GONE)
                views.setViewVisibility(R.id.widget_placeholder, android.view.View.VISIBLE)
                views.setViewVisibility(R.id.dot_indicators, android.view.View.GONE)
                setupClickListeners(context, views, appWidgetId)
                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (fallbackError: Exception) {
                // Last resort - log error but don't crash
                android.util.Log.e("PremiumWidget", "Failed to update widget", fallbackError)
            }
        }
    }

    private fun setupClickListeners(
        context: Context,
        views: RemoteViews,
        appWidgetId: Int
    ) {
        // Next photo (tap on carousel)
        val nextIntent = Intent(context, PremiumCarouselWidgetProvider::class.java).apply {
            action = ACTION_NEXT_PHOTO
        }
        val nextPendingIntent = PendingIntent.getBroadcast(
            context, 0, nextIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.photo_carousel, nextPendingIntent)
        
        // Open app (tap on container)
        val openAppIntent = Intent(context, PremiumCarouselWidgetProvider::class.java).apply {
            action = ACTION_OPEN_APP
        }
        val openAppPendingIntent = PendingIntent.getBroadcast(
            context, 1, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.glass_container, openAppPendingIntent)
    }

    private fun updateDotIndicators(views: RemoteViews, currentIndex: Int, totalPhotos: Int) {
        // Hide dots if less than 2 photos
        if (totalPhotos < 2) {
            views.setViewVisibility(R.id.dot_indicators, android.view.View.GONE)
            return
        }
        
        views.setViewVisibility(R.id.dot_indicators, android.view.View.VISIBLE)
        
        // Reset all dots to inactive
        views.setInt(R.id.dot_1, "setBackgroundResource", R.drawable.dot_inactive)
        views.setInt(R.id.dot_2, "setBackgroundResource", R.drawable.dot_inactive)
        views.setInt(R.id.dot_3, "setBackgroundResource", R.drawable.dot_inactive)
        
        // Set current dot to active (show max 3 dots)
        val dotIndex = currentIndex % 3
        when (dotIndex) {
            0 -> views.setInt(R.id.dot_1, "setBackgroundResource", R.drawable.dot_active)
            1 -> views.setInt(R.id.dot_2, "setBackgroundResource", R.drawable.dot_active)
            2 -> views.setInt(R.id.dot_3, "setBackgroundResource", R.drawable.dot_active)
        }
        
        // Show only needed dots
        views.setViewVisibility(R.id.dot_1, if (totalPhotos >= 1) android.view.View.VISIBLE else android.view.View.GONE)
        views.setViewVisibility(R.id.dot_2, if (totalPhotos >= 2) android.view.View.VISIBLE else android.view.View.GONE)
        views.setViewVisibility(R.id.dot_3, if (totalPhotos >= 3) android.view.View.VISIBLE else android.view.View.GONE)
    }

    private fun loadPhotoList(context: Context): List<String> {
        return try {
            val photoList = mutableListOf<String>()
            
            // Load last 3 photos from storage
            val photosDir = File(context.filesDir, "widget_photos")
            if (photosDir.exists() && photosDir.isDirectory) {
                val photos = photosDir.listFiles()
                    ?.filter { it.isFile && it.name.startsWith("widget_photo_") && it.extension == "jpg" }
                    ?.sortedByDescending { it.lastModified() }
                    ?.take(3)
                
                photos?.forEach { file ->
                    if (file.exists() && file.canRead()) {
                        photoList.add(file.absolutePath)
                    }
                }
            }
            
            photoList
        } catch (e: Exception) {
            android.util.Log.e("PremiumWidget", "Error loading photo list", e)
            emptyList()
        }
    }

    private fun loadBitmap(photoPath: String): Bitmap? {
        return try {
            val file = File(photoPath)
            if (file.exists()) {
                // Load and scale bitmap for widget
                val options = BitmapFactory.Options().apply {
                    inSampleSize = 2 // Scale down for performance
                }
                BitmapFactory.decodeFile(photoPath, options)
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun getTimeAgo(photoPath: String): String {
        return try {
            val file = File(photoPath)
            if (!file.exists()) return "Recently"
            
            val diff = System.currentTimeMillis() - file.lastModified()
            
            when {
                diff < 60000 -> "Just now"
                diff < 3600000 -> "${diff / 60000}m ago"
                diff < 86400000 -> "${diff / 3600000}h ago"
                diff < 604800000 -> "${diff / 86400000}d ago"
                else -> {
                    val date = Date(file.lastModified())
                    SimpleDateFormat("MMM dd", Locale.getDefault()).format(date)
                }
            }
        } catch (e: Exception) {
            "Recently"
        }
    }

    private fun getPartnerName(context: Context): String {
        // Try to get partner name from shared preferences
        val prefs = context.getSharedPreferences("PairlyPrefs", Context.MODE_PRIVATE)
        return prefs.getString("partner_name", "Partner") ?: "Partner"
    }

    private fun updateAllWidgets(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(
            android.content.ComponentName(context, PremiumCarouselWidgetProvider::class.java)
        )
        
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        // Widget added for first time
        super.onEnabled(context)
        
        try {
            // Initialize with empty state
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(
                android.content.ComponentName(context, PremiumCarouselWidgetProvider::class.java)
            )
            
            for (appWidgetId in appWidgetIds) {
                updateWidget(context, appWidgetManager, appWidgetId)
            }
        } catch (e: Exception) {
            android.util.Log.e("PremiumWidget", "Error in onEnabled", e)
        }
    }

    override fun onDisabled(context: Context) {
        // Last widget removed
        super.onDisabled(context)
        
        // Clear preferences
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().clear().apply()
    }
}
