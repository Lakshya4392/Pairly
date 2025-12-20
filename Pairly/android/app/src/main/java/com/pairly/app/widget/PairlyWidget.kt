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
import java.net.HttpURLConnection
import java.net.URL

/**
 * Premium Pairly Widget with image support
 */
class PairlyWidget : AppWidgetProvider() {

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        // Handle custom refresh action (from FCM or manual trigger)
        if (intent.action == ACTION_REFRESH) {
            println("📱 [Widget] Received refresh broadcast")
            updateAllWidgets(context)
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidgetWithDefault(context, appWidgetManager, appWidgetId)
            // Try to fetch latest photo in background
            FetchPhotoTask(context, appWidgetManager, appWidgetId).execute()
        }
    }

    private fun updateWidgetWithDefault(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        try {
            val views = RemoteViews(context.packageName, R.layout.pairly_widget_simple)
            
            // Use current layout IDs
            views.setTextViewText(R.id.widget_sender_name, "Pairly")
            views.setTextViewText(R.id.widget_timestamp, "Tap to share")
            views.setImageViewResource(R.id.widget_image, R.drawable.widget_placeholder)
            
            // Click handler
            val intent = Intent(context, MainActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
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

    companion object {
        private const val API_URL = "https://pairly-60qj.onrender.com"
        const val ACTION_REFRESH = "com.pairly.app.widget.ACTION_REFRESH"
        
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
        fun updateWithPhoto(context: Context, bitmap: Bitmap, senderName: String, momentId: String? = null) {
            try {
                println("📱 [Widget] Updating with photo from: $senderName")
                
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, PairlyWidget::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
                
                if (appWidgetIds.isEmpty()) {
                    println("⚠️ [Widget] No widgets on home screen")
                    return
                }
                
                // Save momentId for reactions
                if (momentId != null) {
                    val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                    prefs.edit().putString("current_moment_id", momentId).apply()
                }
                
                for (appWidgetId in appWidgetIds) {
                    val views = RemoteViews(context.packageName, R.layout.pairly_widget_simple)
                    
                    // Set photo
                    views.setImageViewBitmap(R.id.widget_image, bitmap)
                    views.setTextViewText(R.id.widget_sender_name, "From $senderName 💝")
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
         * Set up single reaction button that opens picker
         */
        private fun setupReactionButtons(context: Context, views: RemoteViews, appWidgetId: Int) {
            try {
                val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                val momentId = prefs.getString("current_moment_id", null) ?: return
                
                // Single reaction button opens picker activity
                val intent = Intent(context, ReactionPickerActivity::class.java).apply {
                    putExtra(ReactionPickerActivity.EXTRA_MOMENT_ID, momentId)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                }
                
                val pendingIntent = PendingIntent.getActivity(
                    context,
                    appWidgetId + 1000, // Unique request code for reaction button
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                
                views.setOnClickPendingIntent(R.id.react_button, pendingIntent)
                
                println("✅ [Widget] Reaction button set up for moment: $momentId")
            } catch (e: Exception) {
                println("⚠️ [Widget] Failed to set up reaction button: ${e.message}")
            }
        }
    }

    /**
     * Background task to fetch partner's latest photo
     */
    private class FetchPhotoTask(
        private val context: Context,
        private val appWidgetManager: AppWidgetManager,
        private val appWidgetId: Int
    ) : AsyncTask<Void, Void, Bitmap?>() {

        override fun doInBackground(vararg params: Void?): Bitmap? {
            try {
                val prefs = context.getSharedPreferences("pairly_prefs", Context.MODE_PRIVATE)
                val authToken = prefs.getString("auth_token", null) ?: return null
                val userId = prefs.getString("user_id", null) ?: return null
                val savedBaseUrl = prefs.getString("backend_url", API_URL)
                
                // Remove trailing slash if present to avoid double slashes
                val baseUrl = savedBaseUrl?.trimEnd('/') ?: API_URL

                val url = URL("$baseUrl/moments/latest?userId=$userId")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("Authorization", "Bearer $authToken")
                connection.setRequestProperty("Content-Type", "application/json")
                connection.connectTimeout = 10000
                connection.readTimeout = 10000

                if (connection.responseCode == 200) {
                    val response = connection.inputStream.bufferedReader().readText()
                    
                    // Parse JSON to get photo base64
                    val photoRegex = "\"photo\"\\s*:\\s*\"([^\"]+)\"".toRegex()
                    val match = photoRegex.find(response)
                    
                    if (match != null) {
                        val base64Photo = match.groupValues[1]
                        // Remove data:image prefix if present
                        val cleanBase64 = base64Photo.replace("data:image/[^;]+;base64,".toRegex(), "")
                        val imageBytes = Base64.decode(cleanBase64, Base64.DEFAULT)
                        return BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                    }
                }
                connection.disconnect()
            } catch (e: Exception) {
                // Silent fail
            }
            return null
        }

        override fun onPostExecute(bitmap: Bitmap?) {
            if (bitmap != null) {
                try {
                    val views = RemoteViews(context.packageName, R.layout.pairly_widget_simple)
                    
                    // Use current layout IDs
                    views.setTextViewText(R.id.widget_sender_name, "From Partner 💝")
                    views.setTextViewText(R.id.widget_timestamp, "Just now")
                    views.setImageViewBitmap(R.id.widget_image, bitmap)
                    
                    // Click handler
                    val intent = Intent(context, MainActivity::class.java)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
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
        }
    }
}
