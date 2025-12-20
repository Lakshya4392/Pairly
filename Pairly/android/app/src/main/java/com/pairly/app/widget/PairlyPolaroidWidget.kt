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
import java.net.HttpURLConnection
import java.net.URL

/**
 * Pairly Polaroid Widget - Premium Style
 * Features: Photo in polaroid frame, "Missing you" text, single reaction button
 */
class PairlyPolaroidWidget : AppWidgetProvider() {

    companion object {
        private const val API_URL = "https://pairly-60qj.onrender.com"
        const val ACTION_REFRESH = "com.pairly.app.widget.POLAROID_REFRESH"

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
         */
        fun updateWithPhoto(context: Context, bitmap: Bitmap, momentId: String? = null) {
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
                if (momentId != null) {
                    val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                    prefs.edit().putString("current_moment_id", momentId).apply()
                }

                for (appWidgetId in appWidgetIds) {
                    val views = RemoteViews(context.packageName, R.layout.pairly_widget_polaroid)

                    // Set photo
                    views.setImageViewBitmap(R.id.widget_image, bitmap)
                    
                    // Hide placeholder
                    views.setViewVisibility(R.id.widget_placeholder, android.view.View.GONE)
                    views.setViewVisibility(R.id.widget_image, android.view.View.VISIBLE)

                    // Click handler for main widget
                    val intent = Intent(context, MainActivity::class.java)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
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
         * Set up single reaction button that opens picker
         */
        private fun setupReactionButton(context: Context, views: RemoteViews, appWidgetId: Int) {
            try {
                val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                val momentId = prefs.getString("current_moment_id", null) ?: return
                
                // Single reaction button opens picker activity (same as simple widget)
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
                
                views.setOnClickPendingIntent(R.id.react_button, pendingIntent)
                
                println("✅ [PolaroidWidget] Reaction button set up for moment: $momentId")
            } catch (e: Exception) {
                println("⚠️ [PolaroidWidget] Failed to set up reaction button: ${e.message}")
            }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        if (intent.action == ACTION_REFRESH) {
            println("📱 [PolaroidWidget] Received refresh")
            updateAllWidgets(context)
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidgetWithDefault(context, appWidgetManager, appWidgetId)
            // Fetch latest photo
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

    /**
     * Background task to fetch latest photo
     */
    private inner class FetchPhotoTask(
        private val context: Context,
        private val appWidgetManager: AppWidgetManager,
        private val appWidgetId: Int
    ) : AsyncTask<Void, Void, Bitmap?>() {

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

                val photoUrl = photoUrlMatch?.groupValues?.get(1) ?: return null

                // Save moment ID
                momentIdMatch?.groupValues?.get(1)?.let { momentId ->
                    prefs.edit().putString("current_moment_id", momentId).apply()
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
                    println("❌ [PolaroidWidget] Post-execute error: ${e.message}")
                }
            }
        }
    }
}
