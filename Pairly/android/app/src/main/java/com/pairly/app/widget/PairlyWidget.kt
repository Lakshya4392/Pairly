package com.pairly.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Handler
import android.os.Looper
import android.widget.RemoteViews
import com.pairly.app.MainActivity
import com.pairly.app.R
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class PairlyWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        // Update all widgets
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        when (intent.action) {
            ACTION_WIDGET_REFRESH -> {
                // Manual refresh triggered
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(
                    android.content.ComponentName(context, PairlyWidget::class.java)
                )
                
                println("🔄 Widget: Manual refresh triggered")
                for (appWidgetId in appWidgetIds) {
                    // Force refresh by clearing last update time
                    val sharedPrefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                    sharedPrefs.edit().remove("last_widget_update").apply()
                    updateAppWidget(context, appWidgetManager, appWidgetId)
                }
            }
        }
    }

    companion object {
        private const val API_BASE_URL = "https://pairly-60qj.onrender.com" // Production backend
        private const val ACTION_WIDGET_REFRESH = "com.pairly.app.widget.REFRESH"
        
        internal fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            try {
                println("🔥 Widget: Starting update for widget $appWidgetId")
                val views = RemoteViews(context.packageName, R.layout.pairly_widget_simple)

                // 🔥 BULLETPROOF: Set all text fields with error handling
                try {
                    views.setTextViewText(R.id.widget_main_text, "Share a Moment")
                    views.setTextViewText(R.id.widget_sub_text, "Tap to capture & send")
                    views.setTextViewText(R.id.widget_status_text, "Ready")
                    views.setTextViewText(R.id.widget_title, "Pairly")
                    println("✅ Widget: Text fields set successfully")
                } catch (e: Exception) {
                    println("❌ Widget: Error setting text fields: ${e.message}")
                }

                // 🔥 BULLETPROOF: Set image with error handling
                try {
                    views.setImageViewResource(R.id.widget_image, R.drawable.widget_placeholder)
                    println("✅ Widget: Placeholder image set successfully")
                } catch (e: Exception) {
                    println("❌ Widget: Error setting image: ${e.message}")
                }

                // Open app on click
                val intent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    putExtra("open_camera", true)
                    putExtra("widget_launch", true)
                    putExtra("source", "widget")
                }
                
                val pendingIntent = PendingIntent.getActivity(
                    context, 
                    appWidgetId, 
                    intent, 
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                
                views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

                // Update widget immediately with default state
                appWidgetManager.updateAppWidget(appWidgetId, views)
                println("✅ 3x3 Widget updated successfully with default state")

                // 🔥 INDEPENDENT LATEST PHOTO LOGIC
                // 1. Try to load locally cached photo first (Offline support)
                var localBitmapLoaded = false
                try {
                    val sharedPrefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                    val localPath = sharedPrefs.getString("last_moment_path", null)
                    
                    if (localPath != null) {
                        println("📂 Widget: Found local photo path: $localPath")
                        val file = java.io.File(localPath)
                        if (file.exists()) {
                            // 🔥 SAFETY: Load scaled down bitmap directly to prevent OOM
                            val bitmap = decodeSampledBitmapFromFile(file.absolutePath, 400, 400)
                            if (bitmap != null) {
                                println("✅ Widget: Loaded photo from local storage (Offline capable)")
                                
                                val processedBitmap = processImageForWidget(bitmap)
                                if (processedBitmap != null) {
                                    views.setImageViewBitmap(R.id.widget_image, processedBitmap)
                                    views.setTextViewText(R.id.widget_main_text, "Latest Moment")
                                    views.setTextViewText(R.id.widget_sub_text, "Tap for new photo")
                                    views.setTextViewText(R.id.widget_status_text, "Downloaded")
                                    views.setInt(R.id.widget_status_dot, "setBackgroundColor", 0xFF4CAF50.toInt()) // Green
                                    
                                    appWidgetManager.updateAppWidget(appWidgetId, views)
                                    localBitmapLoaded = true
                                }
                            }
                        }
                    }
                } catch (e: Exception) {
                    println("⚠️ Widget: Local load failed: ${e.message}")
                }
                
                // 2. If local load failed/missing, fetch from API (Network fallback)
                if (!localBitmapLoaded) {
                    try {
                        // Check if we should fetch (avoid too frequent updates)
                        val sharedPrefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                        val lastUpdate = sharedPrefs.getLong("last_widget_update", 0)
                        val currentTime = System.currentTimeMillis()
                        val timeSinceLastUpdate = currentTime - lastUpdate
                        
                        // Force update if we are in default state (never updated), otherwise respect timeout
                        if (lastUpdate == 0L || timeSinceLastUpdate > 120000) {
                            println("📡 Widget: Fetching new moment from Network")
                            FetchLatestMomentTask(context, appWidgetManager, appWidgetId, views).execute()
                        } else {
                            println("⏰ Widget: Skipping fetch, too recent")
                        }
                    } catch (e: Exception) {
                        println("⚠️ Widget: Background fetch failed, but widget loaded: ${e.message}")
                    }
                }
                
            } catch (e: Exception) {
                println("❌ Widget: Failed to update widget: ${e.message}")
                e.printStackTrace()
            }
        }
        
        // 🔥 SAFETY: Decode bitmap with downsampling to avoid OOM
        private fun decodeSampledBitmapFromFile(path: String, reqWidth: Int, reqHeight: Int): Bitmap? {
            return try {
                // First decode with inJustDecodeBounds=true to check dimensions
                val options = BitmapFactory.Options()
                options.inJustDecodeBounds = true
                BitmapFactory.decodeFile(path, options)

                // Calculate inSampleSize
                options.inSampleSize = calculateInSampleSize(options, reqWidth, reqHeight)

                // Decode bitmap with inSampleSize set
                options.inJustDecodeBounds = false
                BitmapFactory.decodeFile(path, options)
            } catch (e: Exception) {
                println("❌ Widget: Failed to decode bitmap: ${e.message}")
                null
            }
        }

        private fun calculateInSampleSize(options: BitmapFactory.Options, reqWidth: Int, reqHeight: Int): Int {
            val (height: Int, width: Int) = options.outHeight to options.outWidth
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

        // Helper needed for static context access
        private fun processImageForWidget(originalBitmap: Bitmap): Bitmap? {
             try {
                // Calculate optimal size for 3x3 widget (approximately 250dp)
                val targetSize = 400
                
                // Create square crop from center
                val size = minOf(originalBitmap.width, originalBitmap.height)
                val x = (originalBitmap.width - size) / 2
                val y = (originalBitmap.height - size) / 2
                
                val croppedBitmap = Bitmap.createBitmap(originalBitmap, x, y, size, size)
                val scaledBitmap = Bitmap.createScaledBitmap(croppedBitmap, targetSize, targetSize, true)
                
                if (croppedBitmap != originalBitmap) {
                    croppedBitmap.recycle()
                }
                
                return scaledBitmap
            } catch (e: Exception) {
                println("⚠️ Widget: Scale failed: ${e.message}")
                return null // Return null instead of crashing with huge bitmap
            }
        }
    }

    // 🔥 MODERN: ExecutorService instead of deprecated AsyncTask
    private class FetchLatestMomentTask(
        private val context: Context,
        private val appWidgetManager: AppWidgetManager,
        private val appWidgetId: Int,
        private val views: RemoteViews
    ) {
        private val executor = Executors.newSingleThreadExecutor()
        private val handler = Handler(Looper.getMainLooper())

        fun execute() {
            executor.execute {
                val bitmap = fetchMomentInBackground()
                handler.post {
                    if (bitmap != null) {
                        updateWidgetWithResult(bitmap)
                    } else {
                         // Keep default state or current state if fetch fails
                         println("⚠️ Widget: Fetch returned null, keeping current API state")
                    }
                }
            }
        }

        private fun fetchMomentInBackground(): Bitmap? {
            return try {
                // Get stored auth token from SharedPreferences
                val sharedPrefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                val authToken = sharedPrefs.getString("auth_token", null)
                val userId = sharedPrefs.getString("user_id", null)

                if (authToken == null) {
                    println("⚠️ Widget: No auth_token in SharedPreferences - user may need to login")
                    return null
                }
                
                if (userId == null) {
                    println("⚠️ Widget: No user_id in SharedPreferences")
                    return null
                }
                
                println("✅ Widget: Auth token found, fetching latest moment...")

                // 🎯 IMPROVED: Better timeout and retry logic
                val url = URL("$API_BASE_URL/moments/latest")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("Authorization", "Bearer $authToken")
                connection.setRequestProperty("Content-Type", "application/json")
                connection.connectTimeout = 10000 
                connection.readTimeout = 15000
                connection.useCaches = false
                connection.doInput = true

                if (connection.responseCode == 200) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    val photoBase64 = extractPhotoFromResponse(response)
                    
                    if (photoBase64 != null && photoBase64.isNotEmpty()) {
                        val decodedBytes = android.util.Base64.decode(photoBase64, android.util.Base64.DEFAULT)
                        if (decodedBytes.isNotEmpty()) {
                            // 🔥 SAFETY: Decode byte array with sampling too!
                            val options = BitmapFactory.Options()
                            options.inJustDecodeBounds = true
                            BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size, options)
                            
                            options.inSampleSize = calculateInSampleSize(options, 400, 400)
                            options.inJustDecodeBounds = false
                            
                            val bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size, options)
                            return bitmap
                        }
                    }
                }
                connection.disconnect()
                null
            } catch (e: Exception) {
                e.printStackTrace()
                null
            }
        }
        
        // Re-use logic for sample size
        private fun calculateInSampleSize(options: BitmapFactory.Options, reqWidth: Int, reqHeight: Int): Int {
            val (height: Int, width: Int) = options.outHeight to options.outWidth
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

        private fun extractPhotoFromResponse(jsonResponse: String): String? {
             try {
                println("📦 Widget: Parsing response (${jsonResponse.length} chars)")
                
                // The API returns: {"success":true,"data":{"photo":"base64...","partnerName":"...","sentAt":"..."}}
                // First check if success is true
                if (!jsonResponse.contains("\"success\":true")) {
                    println("⚠️ Widget: API response indicates failure")
                    return null
                }
                
                // Look for "photo" inside "data" object
                var photoBase64: String? = null
                
                // Find the data object first
                val dataStart = jsonResponse.indexOf("\"data\":")
                if (dataStart != -1) {
                    val dataSubstring = jsonResponse.substring(dataStart)
                    
                    // Look for "photo" field within data
                    var photoStart = dataSubstring.indexOf("\"photo\":\"")
                    if (photoStart != -1) {
                        photoStart += 9 // Skip past "photo":"
                        val photoEnd = dataSubstring.indexOf("\"", photoStart)
                        if (photoEnd != -1 && photoEnd > photoStart) {
                            photoBase64 = dataSubstring.substring(photoStart, photoEnd)
                            println("✅ Widget: Found 'photo' field (${photoBase64.length} chars)")
                        }
                    }
                    
                    // Fallback: try "image" field
                    if (photoBase64.isNullOrEmpty()) {
                        var imageStart = dataSubstring.indexOf("\"image\":\"")
                        if (imageStart != -1) {
                            imageStart += 9
                            val imageEnd = dataSubstring.indexOf("\"", imageStart)
                            if (imageEnd != -1 && imageEnd > imageStart) {
                                photoBase64 = dataSubstring.substring(imageStart, imageEnd)
                                println("✅ Widget: Found 'image' field (${photoBase64.length} chars)")
                            }
                        }
                    }
                }
                
                // Validate we got actual base64 data
                if (!photoBase64.isNullOrEmpty() && photoBase64.length > 100) {
                    // Strip data URI prefix if present
                    if (photoBase64.startsWith("data:image")) {
                        val commaIndex = photoBase64.indexOf(",")
                        if (commaIndex != -1) {
                            photoBase64 = photoBase64.substring(commaIndex + 1)
                        }
                    }
                    println("✅ Widget: Valid photo data extracted")
                    return photoBase64
                }
                
                println("⚠️ Widget: No valid photo found in response")
                return null
            } catch (e: Exception) {
                println("❌ Widget: JSON parsing error: ${e.message}")
                return null
            }
        }

        private fun updateWidgetWithResult(bitmap: Bitmap) {
            try {
                // Same process logic as parent, unfortunately needs duplication or refactoring
                // For safety in this hotfix, we duplicate the safety scale logic
                val processedBitmap = processImageForWidget(bitmap)
                
                if (processedBitmap != null) {
                    views.setImageViewBitmap(R.id.widget_image, processedBitmap)
                    views.setTextViewText(R.id.widget_main_text, "Latest Moment")
                    views.setTextViewText(R.id.widget_sub_text, "Tap for new photo")
                    views.setTextViewText(R.id.widget_status_text, "Connected")
                    views.setInt(R.id.widget_status_dot, "setBackgroundColor", 0xFF4CAF50.toInt())
                    
                    val sharedPrefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                    sharedPrefs.edit().putLong("last_widget_update", System.currentTimeMillis()).apply()
                    
                    appWidgetManager.updateAppWidget(appWidgetId, views)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        
        private fun processImageForWidget(originalBitmap: Bitmap): Bitmap? {
             try {
                val targetSize = 400
                val size = minOf(originalBitmap.width, originalBitmap.height)
                val x = (originalBitmap.width - size) / 2
                val y = (originalBitmap.height - size) / 2
                val croppedBitmap = Bitmap.createBitmap(originalBitmap, x, y, size, size)
                val scaledBitmap = Bitmap.createScaledBitmap(croppedBitmap, targetSize, targetSize, true)
                if (croppedBitmap != originalBitmap) croppedBitmap.recycle()
                return scaledBitmap
            } catch (e: Exception) {
                return null
            }
        }
    }
}
